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

namespace trajopt {

inline Translation2d WheelToChassisSpeeds(double vL, double vR) {
  return Translation2d{(vL + vR) / 2, 0.0};
}

inline Translation2v WheelToChassisSpeeds(sleipnir::Variable vL,
                                          sleipnir::Variable vR) {
  return Translation2v{(vL + vR) / 2, 0.0};
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
  heading.reserve(sampTot);
  vL.reserve(sampTot);
  vR.reserve(sampTot);
  aL.reserve(sampTot);
  aR.reserve(sampTot);

  FL.reserve(sampTot);
  FR.reserve(sampTot);

  dts.reserve(sgmtCnt);

  for (size_t index = 0; index < sampTot; ++index) {
    x.emplace_back(problem.DecisionVariable());
    y.emplace_back(problem.DecisionVariable());
    heading.emplace_back(problem.DecisionVariable());
    vL.emplace_back(problem.DecisionVariable());
    vR.emplace_back(problem.DecisionVariable());
    aL.emplace_back(problem.DecisionVariable());
    aR.emplace_back(problem.DecisionVariable());

    FL.emplace_back(problem.DecisionVariable());
    FR.emplace_back(problem.DecisionVariable());
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
      path.drivetrain.wheelMaxTorque / path.drivetrain.wheelRadius;
  const auto maxAccel = maxForce / path.drivetrain.mass;
  const double maxDrivetrainVelocity =
      path.drivetrain.wheelRadius * path.drivetrain.wheelMaxAngularVelocity;
  const auto maxAngVel = maxDrivetrainVelocity * 2 / path.drivetrain.trackwidth;
  for (size_t sgmtIndex = 0; sgmtIndex < Ns.size(); ++sgmtIndex) {
    auto& dt_sgmt = dts.at(sgmtIndex);
    auto N_sgmt = Ns.at(sgmtIndex);
    auto T_sgmt = dt_sgmt * static_cast<int>(N_sgmt);
    T_tot += T_sgmt;

    problem.SubjectTo(dt_sgmt >= 0);
    // Use initialGuess and Ns to find the dx, dy, dtheta between wpts
    const auto sgmt_start = GetIndex(Ns, sgmtIndex);
    const auto sgmt_end = GetIndex(Ns, sgmtIndex + 1);
    const auto dx = initialGuess.x.at(sgmt_end) - initialGuess.x.at(sgmt_start);
    const auto dy = initialGuess.y.at(sgmt_end) - initialGuess.y.at(sgmt_start);
    const auto dist = std::hypot(dx, dy);
    const auto cos_0 = std::cos(initialGuess.heading.at(sgmt_start));
    const auto sin_0 = std::sin(initialGuess.heading.at(sgmt_start));
    const auto cos_1 = std::cos(initialGuess.heading.at(sgmt_end));
    const auto sin_1 = std::sin(initialGuess.heading.at(sgmt_end));
    const auto dtheta = std::abs(std::atan2(cos_0 * sin_1 - sin_0 * cos_1,
                                            cos_0 * sin_1 + sin_0 * cos_1));
    auto maxLinearVel = maxDrivetrainVelocity;

    // Proof for T = 1.5 * θ / ω:
    //
    // The position function of a cubic Hermite spline
    // where t∈[0, 1] and θ∈[0, dtheta]:
    // x(t) = (-2t^3 +3t^2)θ
    //

    // The velocity function derived from the cubic Hermite spline is:
    // v(t) = (-6t^2 + 6t)θ.
    //
    // The peak velocity occurs at t = 0.5, where t∈[0, 1] :
    // v(0.5) = 1.5*θ, which is the max angular velocity during the motion.
    //
    // To ensure this peak velocity does not exceed ω, max_ang_vel, we set:
    // 1.5 * θ = ω.
    //
    // The total time T needed to reach the final θ and
    // not exceed ω is thus derived as:
    // T = θ / (ω / 1.5) = 1.5 * θ / ω.
    //
    // This calculation ensures the peak velocity meets but does not exceed ω,
    // extending the time proportionally to meet this requirement.
    // This is an alternative estimation method to finding the trapezoidal or
    // triangular profile for the change heading.
    const auto angular_time = (1.5 * dtheta) / maxAngVel;
    maxLinearVel = std::min(maxLinearVel, dist / angular_time);

    const auto distanceAtCruise =
        dist - (maxLinearVel * maxLinearVel) / maxAccel;

    double sgmtTime = angular_time;
    if (distanceAtCruise < 0) {
      // triangle
      sgmtTime += 2.0 * (std::sqrt(dist * maxAccel) / maxAccel);
    } else {
      // trapezoid
      sgmtTime += dist / maxLinearVel + maxLinearVel / maxAccel;
    }
    dt_sgmt.SetValue(sgmtTime / N_sgmt);
  }
  problem.Minimize(std::move(T_tot));

  // Apply kinematics constraints
  for (size_t wptIndex = 0; wptIndex < wptCnt - 1; ++wptIndex) {
    size_t N_sgmt = Ns.at(wptIndex);
    auto dt_sgmt = dts.at(wptIndex);

    for (size_t sampIndex = 1; sampIndex <= N_sgmt; ++sampIndex) {
      size_t index = GetIndex(Ns, wptIndex, sampIndex);

      Translation2v x_n{x.at(index), y.at(index)};
      Translation2v x_n_1{x.at(index - 1), y.at(index - 1)};

      Rotation2v theta_n{heading.at(index)};
      Rotation2v theta_n_1{heading.at(index - 1)};

      Translation2v v_n = WheelToChassisSpeeds(vL.at(index), vR.at(index));
      v_n = v_n.RotateBy(theta_n);
      Translation2v v_n_1 =
          WheelToChassisSpeeds(vL.at(index - 1), vR.at(index - 1));
      v_n_1 = v_n_1.RotateBy(theta_n_1);

      auto omega_n = (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;
      auto omega_n_1 =
          (vR.at(index - 1) - vL.at(index - 1)) / path.drivetrain.trackwidth;

      Translation2v a_n = WheelToChassisSpeeds(aL.at(index), aR.at(index));
      Translation2v a_n_1 =
          WheelToChassisSpeeds(aL.at(index - 1), aR.at(index - 1));

      problem.SubjectTo(
          x_n_1 + v_n_1 * dt_sgmt + a_n_1 * 0.5 * dt_sgmt * dt_sgmt == x_n);

      auto lhs = heading.at(index) - heading.at(index - 1);
      auto rhs = omega_n * dt_sgmt;
      problem.SubjectTo(slp::cos(lhs) == slp::cos(rhs));
      problem.SubjectTo(slp::sin(lhs) == slp::sin(rhs));

      problem.SubjectTo(v_n_1 + a_n_1 * dt_sgmt == v_n);
    }
  }

  for (size_t index = 0; index < sampTot; ++index) {
    Translation2v v = WheelToChassisSpeeds(vL.at(index), vR.at(index));
    Rotation2v theta{heading.at(index)};
    auto angularVelocity =
        (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;

    // Solve for net force
    auto F_net = FL.at(index) + FR.at(index);

    // Solve for net torque
    double r = path.drivetrain.trackwidth / 2.0;
    auto tau_net = r * FR.at(index) - r * FL.at(index);

    // Apply wheel power constraints
    {
      auto vWrtRobot = v.RotateBy(-theta);
      const auto& wheelRadius = path.drivetrain.wheelRadius;
      const auto& wheelMaxAngularVelocity =
          path.drivetrain.wheelMaxAngularVelocity;
      const auto& wheelMaxTorque = path.drivetrain.wheelMaxTorque;

      Translation2v vWheelWrtRobot{
          vWrtRobot.X() - path.drivetrain.trackwidth / 2.0 * angularVelocity,
          vWrtRobot.Y()};
      double maxWheelVelocity = wheelRadius * wheelMaxAngularVelocity;
      problem.SubjectTo(vWheelWrtRobot.SquaredNorm() <=
                        maxWheelVelocity * maxWheelVelocity);

      double maxForce = wheelMaxTorque / wheelRadius;
      problem.SubjectTo(-maxForce < FL.at(index));
      problem.SubjectTo(FL.at(index) < maxForce);
      problem.SubjectTo(-maxForce < FR.at(index));
      problem.SubjectTo(FR.at(index) < maxForce);

      // Apply dynamics constraints
      auto a = (aL.at(index) + aR.at(index)) / 2.0;
      problem.SubjectTo(FL.at(index) + FR.at(index) ==
                        path.drivetrain.mass * a);
      auto alpha = (aR.at(index) - aL.at(index)) / path.drivetrain.trackwidth;
      problem.SubjectTo(tau_net == path.drivetrain.moi * alpha);
    }
  }

  for (size_t wptIndex = 0; wptIndex < wptCnt; ++wptIndex) {
    for (auto& constraint : path.waypoints.at(wptIndex).waypointConstraints) {
      // First index of next wpt - 1
      size_t index = GetIndex(Ns, wptIndex, 0);

      Pose2v pose{x.at(index), y.at(index), {heading.at(index)}};

      Translation2v linearVelocity =
          WheelToChassisSpeeds(vL.at(index), vR.at(index));

      auto angularVelocity =
          (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;

      Translation2v linearAcceleration =
          WheelToChassisSpeeds(aL.at(index), aR.at(index));

      auto angularAcceleration =
          (aR.at(index) - aL.at(index)) / path.drivetrain.trackwidth;

      std::visit(
          [&](auto&& arg) {
            arg.Apply(problem, pose, linearVelocity, angularVelocity,
                      linearAcceleration, angularAcceleration);
          },
          constraint);
    }
  }

  for (size_t sgmtIndex = 0; sgmtIndex < sgmtCnt; ++sgmtIndex) {
    for (auto& constraint :
         path.waypoints.at(sgmtIndex + 1).segmentConstraints) {
      size_t startIndex = GetIndex(Ns, sgmtIndex, 0);
      size_t endIndex = GetIndex(Ns, sgmtIndex + 1, 0);

      for (size_t index = startIndex; index < endIndex; ++index) {
        Pose2v pose{x.at(index), y.at(index), {heading.at(index)}};

        Translation2v linearVelocity =
            WheelToChassisSpeeds(vL.at(index), vR.at(index));

        auto angularVelocity =
            (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;

        Translation2v linearAcceleration =
            WheelToChassisSpeeds(aL.at(index), aR.at(index));

        auto angularAcceleration =
            (aR.at(index) - aL.at(index)) / path.drivetrain.trackwidth;

        std::visit(
            [&](auto&& arg) {
              arg.Apply(problem, pose, linearVelocity, angularVelocity,
                        linearAcceleration, angularAcceleration);
            },
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
    heading[sampleIndex].SetValue(solution.heading[sampleIndex]);
  }

  vL[0].SetValue(0.0);
  vR[0].SetValue(0.0);
  aL[0].SetValue(0.0);
  aR[0].SetValue(0.0);

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
    vL[sampleIndex].SetValue(
        (linearVelocity - path.drivetrain.trackwidth / 2 * omega));
    vR[sampleIndex].SetValue(
        (linearVelocity + path.drivetrain.trackwidth / 2 * omega));
    aL[sampleIndex].SetValue(
        (vL[sampleIndex].Value() - vL[sampleIndex - 1].Value()) /
        solution.dt[sampleIndex]);
    aR[sampleIndex].SetValue(
        (vR[sampleIndex].Value() - vR[sampleIndex - 1].Value()) /
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
      dtPerSample,     vectorValue(x),  vectorValue(y),  vectorValue(heading),
      vectorValue(vL), vectorValue(vR), vectorValue(aL), vectorValue(aR),
      vectorValue(FL), vectorValue(FR),
  };
}

}  // namespace trajopt
