// Copyright (c) TrajoptLib contributors

#include "trajopt/DifferentialTrajectoryGenerator.hpp"

#include <algorithm>
#include <cmath>
#include <ranges>
#include <utility>
#include <vector>

#include <sleipnir/autodiff/Variable.hpp>
#include <sleipnir/optimization/SolverExitCondition.hpp>

#include "trajopt/geometry/Rotation2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/Cancellation.hpp"
#include "trajopt/util/TrajoptUtil.hpp"

// Physics notation in this file:
//
//   x = linear position
//   v = linear velocity
//   a = linear acceleration
//   θ = heading
//   ω = angular velocity
//   α = angular acceleration
//   F = force
//   τ = torque
//   t = time
//
// A `d` prefix to one of these means delta.

namespace trajopt {

inline Translation2d WheelToChassisSpeeds(double vl, double vr) {
  return Translation2d{(vl + vr) / 2, 0.0};
}

inline Translation2v WheelToChassisSpeeds(sleipnir::Variable vl,
                                          sleipnir::Variable vr) {
  return Translation2v{(vl + vr) / 2, 0.0};
}

DifferentialTrajectoryGenerator::DifferentialTrajectoryGenerator(
    DifferentialPathBuilder pathbuilder, int64_t handle)
    : path(pathbuilder.GetPath()), Ns(pathbuilder.GetControlIntervalCounts()) {
  namespace slp = sleipnir;

  auto initialGuess = pathbuilder.CalculateInitialGuess();

  callbacks.emplace_back([this, handle = handle] {
    constexpr int fps = 60;
    constexpr std::chrono::duration<double> timePerFrame{1.0 / fps};

    // FPS limit on sending updates
    static auto lastFrameTime = std::chrono::steady_clock::now();
    auto now = std::chrono::steady_clock::now();
    if (now - lastFrameTime < timePerFrame) {
      return;
    }

    lastFrameTime = now;

    auto soln = ConstructDifferentialSolution();
    for (auto& callback : this->path.callbacks) {
      callback(soln, handle);
    }
  });

  size_t wptCnt = path.waypoints.size();
  size_t sgmtCnt = path.waypoints.size() - 1;
  size_t sampTot = GetIndex(Ns, wptCnt - 1, 0) + 1;

  x.reserve(sampTot);
  y.reserve(sampTot);
  θ.reserve(sampTot);
  vl.reserve(sampTot);
  vr.reserve(sampTot);
  al.reserve(sampTot);
  ar.reserve(sampTot);

  Fl.reserve(sampTot);
  Fr.reserve(sampTot);

  dts.reserve(sgmtCnt);

  for (size_t index = 0; index < sampTot; ++index) {
    x.emplace_back(problem.DecisionVariable());
    y.emplace_back(problem.DecisionVariable());
    θ.emplace_back(problem.DecisionVariable());
    vl.emplace_back(problem.DecisionVariable());
    vr.emplace_back(problem.DecisionVariable());
    al.emplace_back(problem.DecisionVariable());
    ar.emplace_back(problem.DecisionVariable());

    Fl.emplace_back(problem.DecisionVariable());
    Fr.emplace_back(problem.DecisionVariable());
  }

  double minWidth = path.drivetrain.trackwidth;

  for (size_t sgmtIndex = 0; sgmtIndex < sgmtCnt; ++sgmtIndex) {
    dts.emplace_back(problem.DecisionVariable());

    // Prevent drivetrain tunneling through obstacles
    problem.SubjectTo(dts.at(sgmtIndex) * path.drivetrain.wheelRadius *
                          path.drivetrain.wheelMaxAngularVelocity <=
                      minWidth);
  }

  // Minimize total time
  sleipnir::Variable T_tot = 0;
  const double maxForce =
      path.drivetrain.wheelMaxTorque * 2 / path.drivetrain.wheelRadius;
  const auto maxAccel = maxForce / path.drivetrain.mass;
  const double maxDrivetrainVelocity =
      path.drivetrain.wheelRadius * path.drivetrain.wheelMaxAngularVelocity;
  const auto maxAngVel = maxDrivetrainVelocity * 2 / path.drivetrain.trackwidth;
  const auto maxAngAccel = maxAccel * 2 / path.drivetrain.trackwidth;
  for (size_t sgmtIndex = 0; sgmtIndex < Ns.size(); ++sgmtIndex) {
    auto& dt = dts.at(sgmtIndex);
    auto N_sgmt = Ns.at(sgmtIndex);
    auto T_sgmt = dt * static_cast<int>(N_sgmt);
    T_tot += T_sgmt;

    problem.SubjectTo(dt >= 0);
    // Use initialGuess and Ns to find the dx, dy, dθ between wpts
    const auto sgmt_start = GetIndex(Ns, sgmtIndex);
    const auto sgmt_end = GetIndex(Ns, sgmtIndex + 1);
    const auto dx = initialGuess.x.at(sgmt_end) - initialGuess.x.at(sgmt_start);
    const auto dy = initialGuess.y.at(sgmt_end) - initialGuess.y.at(sgmt_start);
    const auto dist = std::hypot(dx, dy);
    const auto θ_0 = initialGuess.heading.at(sgmt_start);
    const auto θ_1 = initialGuess.heading.at(sgmt_end);
    const auto dθ = std::abs(AngleModulus(θ_0 - θ_1));

    auto maxLinearVel = maxDrivetrainVelocity;

    const auto angularTime =
        CalculateTrapezoidalTime(dθ, maxAngVel, maxAngAccel);
    maxLinearVel = std::min(maxLinearVel, dist / angularTime);

    const auto linearTime =
        CalculateTrapezoidalTime(dist, maxLinearVel, maxAccel);
    const double sgmtTime = angularTime + linearTime;

    dt.SetValue(sgmtTime / N_sgmt);
  }
  problem.Minimize(std::move(T_tot));

  // Apply kinematics constraints
  for (size_t wptIndex = 0; wptIndex < wptCnt - 1; ++wptIndex) {
    size_t N_sgmt = Ns.at(wptIndex);
    auto dt = dts.at(wptIndex);

    for (size_t sampleIndex = 0; sampleIndex < N_sgmt; ++sampleIndex) {
      size_t index = GetIndex(Ns, wptIndex, sampleIndex);

      Translation2v x_k{x.at(index), y.at(index)};
      Translation2v x_k_1{x.at(index + 1), y.at(index + 1)};

      Rotation2v θ_k{θ.at(index)};
      Rotation2v θ_k_1{θ.at(index + 1)};

      Translation2v v_k = WheelToChassisSpeeds(vl.at(index), vr.at(index));
      v_k = v_k.RotateBy(θ_k);
      Translation2v v_k_1 =
          WheelToChassisSpeeds(vl.at(index + 1), vr.at(index + 1));
      v_k_1 = v_k_1.RotateBy(θ_k_1);

      auto ω_k = (vr.at(index) - vl.at(index)) / path.drivetrain.trackwidth;
      auto ω_k_1 =
          (vr.at(index + 1) - vl.at(index + 1)) / path.drivetrain.trackwidth;

      Translation2v a_k = WheelToChassisSpeeds(al.at(index), ar.at(index));
      a_k = a_k.RotateBy(θ_k);
      Translation2v a_k_1 =
          WheelToChassisSpeeds(al.at(index + 1), ar.at(index + 1));
      a_k_1 = a_k_1.RotateBy(θ_k_1);

      // xₖ₊₁ = xₖ + vₖt + 1/2aₖt²
      problem.SubjectTo(x_k_1 == x_k + v_k * dt + a_k * 0.5 * dt * dt);

      // θₖ₊₁ = θₖ + ωₖt
      // θₖ₊₁ − θₖ = ωₖt
      auto lhs = θ.at(index + 1) - θ.at(index);
      auto rhs = ω_k * dt;
      problem.SubjectTo(slp::cos(lhs) == slp::cos(rhs));
      problem.SubjectTo(slp::sin(lhs) == slp::sin(rhs));

      // vₖ₊₁ = vₖ + aₖt
      problem.SubjectTo(v_k_1 == v_k + a_k * dt);
    }
  }

  for (size_t index = 0; index < sampTot; ++index) {
    Translation2v v_k = WheelToChassisSpeeds(vl.at(index), vr.at(index));
    Rotation2v θ_k{θ.at(index)};
    auto ω_k = (vr.at(index) - vl.at(index)) / path.drivetrain.trackwidth;

    // Solve for net force
    auto F_net = Fl.at(index) + Fr.at(index);

    // Solve for net torque
    double r = path.drivetrain.trackwidth / 2.0;
    auto τ_net = r * Fr.at(index) - r * Fr.at(index);

    // Apply wheel power constraints
    {
      auto vWrtRobot = v_k.RotateBy(-θ_k);
      const auto& wheelRadius = path.drivetrain.wheelRadius;
      const auto& wheelMaxAngularVelocity =
          path.drivetrain.wheelMaxAngularVelocity;
      const auto& wheelMaxTorque = path.drivetrain.wheelMaxTorque;

      Translation2v vWheelWrtRobot{
          vWrtRobot.X() - path.drivetrain.trackwidth / 2.0 * ω_k,
          vWrtRobot.Y()};
      double maxWheelVelocity = wheelRadius * wheelMaxAngularVelocity;

      // |v|₂² ≤ vₘₐₓ²
      problem.SubjectTo(vWheelWrtRobot.SquaredNorm() <=
                        maxWheelVelocity * maxWheelVelocity);

      double maxForce = wheelMaxTorque / wheelRadius;

      // −Fₘₐₓ < Fₗ < Fₘₐₓ
      problem.SubjectTo(-maxForce < Fl.at(index));
      problem.SubjectTo(Fl.at(index) < maxForce);

      // −Fₘₐₓ < Fᵣ < Fₘₐₓ
      problem.SubjectTo(-maxForce < Fr.at(index));
      problem.SubjectTo(Fr.at(index) < maxForce);

      auto a_k = (al.at(index) + ar.at(index)) / 2.0;
      auto α_k = (ar.at(index) - al.at(index)) / path.drivetrain.trackwidth;

      // Apply dynamics constraints
      //
      //   ΣFₖ = maₖ
      //   Στₖ = Jαₖ
      problem.SubjectTo(Fl.at(index) + Fr.at(index) ==
                        path.drivetrain.mass * a_k);
      problem.SubjectTo(τ_net == path.drivetrain.moi * α_k);
    }
  }

  for (size_t wptIndex = 0; wptIndex < wptCnt; ++wptIndex) {
    for (auto& constraint : path.waypoints.at(wptIndex).waypointConstraints) {
      // First index of next wpt - 1
      size_t index = GetIndex(Ns, wptIndex, 0);

      Pose2v pose_k{x.at(index), y.at(index), {θ.at(index)}};
      Translation2v v_k = WheelToChassisSpeeds(vl.at(index), vr.at(index));
      auto ω_k = (vr.at(index) - vl.at(index)) / path.drivetrain.trackwidth;
      Translation2v a_k = WheelToChassisSpeeds(al.at(index), ar.at(index));
      auto α_k = (ar.at(index) - al.at(index)) / path.drivetrain.trackwidth;

      std::visit(
          [&](auto&& arg) { arg.Apply(problem, pose_k, v_k, ω_k, a_k, α_k); },
          constraint);
    }
  }

  for (size_t sgmtIndex = 0; sgmtIndex < sgmtCnt; ++sgmtIndex) {
    for (auto& constraint :
         path.waypoints.at(sgmtIndex + 1).segmentConstraints) {
      size_t startIndex = GetIndex(Ns, sgmtIndex, 0);
      size_t endIndex = GetIndex(Ns, sgmtIndex + 1, 0);

      for (size_t index = startIndex; index < endIndex; ++index) {
        Pose2v pose_k{x.at(index), y.at(index), {θ.at(index)}};
        Translation2v v_k = WheelToChassisSpeeds(vl.at(index), vr.at(index));
        auto ω_k = (vr.at(index) - vl.at(index)) / path.drivetrain.trackwidth;
        Translation2v a_k = WheelToChassisSpeeds(al.at(index), ar.at(index));
        auto α_k = (ar.at(index) - al.at(index)) / path.drivetrain.trackwidth;

        std::visit(
            [&](auto&& arg) { arg.Apply(problem, pose_k, v_k, ω_k, a_k, α_k); },
            constraint);
      }
    }
  }

  ApplyInitialGuess(initialGuess);
}

expected<DifferentialSolution, sleipnir::SolverExitCondition>
DifferentialTrajectoryGenerator::Generate(bool diagnostics) {
  problem.Callback([this](const sleipnir::SolverIterationInfo&) -> bool {
    for (auto& callback : callbacks) {
      callback();
    }
    return trajopt::GetCancellationFlag();
  });

  // tolerance of 1e-4 is 0.1 mm
  auto status = problem.Solve({.tolerance = 1e-4, .diagnostics = diagnostics});

  if (static_cast<int>(status.exitCondition) < 0 ||
      status.exitCondition ==
          sleipnir::SolverExitCondition::kCallbackRequestedStop) {
    return unexpected{status.exitCondition};
  } else {
    return ConstructDifferentialSolution();
  }
}

void DifferentialTrajectoryGenerator::ApplyInitialGuess(
    const DifferentialSolution& solution) {
  size_t sampleTotal = x.size();
  for (size_t sampleIndex = 0; sampleIndex < sampleTotal; ++sampleIndex) {
    x[sampleIndex].SetValue(solution.x[sampleIndex]);
    y[sampleIndex].SetValue(solution.y[sampleIndex]);
    θ[sampleIndex].SetValue(solution.heading[sampleIndex]);
  }

  vl[0].SetValue(0.0);
  vr[0].SetValue(0.0);
  al[0].SetValue(0.0);
  ar[0].SetValue(0.0);

  for (size_t sampleIndex = 1; sampleIndex < sampleTotal; ++sampleIndex) {
    double linearVelocity =
        std::hypot(solution.x[sampleIndex] - solution.x[sampleIndex - 1],
                   solution.y[sampleIndex] - solution.y[sampleIndex - 1]) /
        solution.dt[sampleIndex];
    double heading = solution.heading[sampleIndex];
    double last_heading = solution.heading[sampleIndex - 1];

    double omega =
        Rotation2d{heading}.RotateBy(-Rotation2d{last_heading}).Radians() /
        solution.dt[sampleIndex];
    vl[sampleIndex].SetValue(
        (linearVelocity - path.drivetrain.trackwidth / 2 * omega));
    vr[sampleIndex].SetValue(
        (linearVelocity + path.drivetrain.trackwidth / 2 * omega));
    al[sampleIndex].SetValue(
        (vl[sampleIndex].Value() - vl[sampleIndex - 1].Value()) /
        solution.dt[sampleIndex]);
    ar[sampleIndex].SetValue(
        (vr[sampleIndex].Value() - vr[sampleIndex - 1].Value()) /
        solution.dt[sampleIndex]);
  }
}

DifferentialSolution
DifferentialTrajectoryGenerator::ConstructDifferentialSolution() {
  std::vector<double> dtPerSample;
  for (size_t sgmtIndex = 0; sgmtIndex < Ns.size(); ++sgmtIndex) {
    auto N = Ns.at(sgmtIndex);
    auto dt = dts.at(sgmtIndex);

    double dt_value = dt.Value();
    for (size_t i = 0; i < N; ++i) {
      dtPerSample.push_back(dt_value);
    }
  }

  auto getValue = [](auto& var) { return var.Value(); };

  // TODO: Use std::ranges::to() from C++23
  auto vectorValue = [&](std::vector<sleipnir::Variable>& row) {
    auto view = row | std::views::transform(getValue);
    return std::vector<double>{std::begin(view), std::end(view)};
  };

  return DifferentialSolution{
      dtPerSample,     vectorValue(x),  vectorValue(y),  vectorValue(θ),
      vectorValue(vl), vectorValue(vr), vectorValue(al), vectorValue(ar),
      vectorValue(Fl), vectorValue(Fr),
  };
}

}  // namespace trajopt
