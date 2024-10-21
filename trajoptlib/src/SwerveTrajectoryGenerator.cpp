// Copyright (c) TrajoptLib contributors

#include "trajopt/SwerveTrajectoryGenerator.hpp"

#include <stdint.h>

#include <algorithm>
#include <chrono>
#include <ranges>
#include <utility>
#include <vector>

#include <sleipnir/optimization/OptimizationProblem.hpp>
#include <sleipnir/optimization/SolverExitCondition.hpp>

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

SwerveTrajectoryGenerator::SwerveTrajectoryGenerator(
    SwervePathBuilder pathBuilder, int64_t handle)
    : path(pathBuilder.GetPath()), Ns(pathBuilder.GetControlIntervalCounts()) {
  // auto initialGuess = pathBuilder.CalculateInitialGuess();
  /// TODO: Delete this ^^^
  auto initialGuess = pathBuilder.CalculateSplineInitialGuess();

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

    auto soln = ConstructSwerveSolution();
    for (auto& callback : this->path.callbacks) {
      callback(soln, handle);
    }
  });

  size_t wptCnt = path.waypoints.size();
  size_t sgmtCnt = path.waypoints.size() - 1;
  size_t sampTot = GetIndex(Ns, wptCnt - 1, 0) + 1;
  size_t moduleCnt = path.drivetrain.modules.size();

  x.reserve(sampTot);
  y.reserve(sampTot);
  cosθ.reserve(sampTot);
  sinθ.reserve(sampTot);
  vx.reserve(sampTot);
  vy.reserve(sampTot);
  ω.reserve(sampTot);
  ax.reserve(sampTot);
  ay.reserve(sampTot);
  α.reserve(sampTot);

  Fx.reserve(sampTot);
  Fy.reserve(sampTot);
  for (size_t sampleIndex = 0; sampleIndex < sampTot; ++sampleIndex) {
    auto& _Fx = Fx.emplace_back();
    auto& _Fy = Fy.emplace_back();
    _Fx.reserve(moduleCnt);
    _Fy.reserve(moduleCnt);
  }

  dts.reserve(sgmtCnt);

  for (size_t index = 0; index < sampTot; ++index) {
    x.emplace_back(problem.DecisionVariable());
    y.emplace_back(problem.DecisionVariable());
    cosθ.emplace_back(problem.DecisionVariable());
    sinθ.emplace_back(problem.DecisionVariable());
    vx.emplace_back(problem.DecisionVariable());
    vy.emplace_back(problem.DecisionVariable());
    ω.emplace_back(problem.DecisionVariable());
    ax.emplace_back(problem.DecisionVariable());
    ay.emplace_back(problem.DecisionVariable());
    α.emplace_back(problem.DecisionVariable());

    for (size_t moduleIndex = 0; moduleIndex < moduleCnt; ++moduleIndex) {
      Fx.at(index).emplace_back(problem.DecisionVariable());
      Fy.at(index).emplace_back(problem.DecisionVariable());
    }
  }

  double minWidth = INFINITY;
  for (size_t i = 0; i < path.drivetrain.modules.size(); ++i) {
    auto mod_a = path.drivetrain.modules.at(i);
    size_t mod_b_idx = i == 0 ? path.drivetrain.modules.size() - 1 : i - 1;
    auto mod_b = path.drivetrain.modules.at(mod_b_idx);
    minWidth = std::min(
        minWidth, std::hypot(mod_a.X() - mod_b.X(), mod_a.Y() - mod_b.Y()));
  }

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
      path.drivetrain.wheelMaxTorque * 4 / path.drivetrain.wheelRadius;
  const auto maxAccel = maxForce / path.drivetrain.mass;
  const double maxDrivetrainVelocity =
      path.drivetrain.wheelRadius * path.drivetrain.wheelMaxAngularVelocity;
  auto maxWheelPositionRadius = 0.0;
  for (auto module : path.drivetrain.modules) {
    maxWheelPositionRadius = std::max(maxWheelPositionRadius, module.Norm());
  }
  const auto maxAngVel = maxDrivetrainVelocity / maxWheelPositionRadius;
  const auto maxAngAccel = maxAccel / maxWheelPositionRadius;
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
    const auto θ_0 = std::atan2(initialGuess.thetasin.at(sgmt_start),
                                initialGuess.thetacos.at(sgmt_start));
    const auto θ_1 = std::atan2(initialGuess.thetasin.at(sgmt_end),
                                initialGuess.thetacos.at(sgmt_end));
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

      Rotation2v θ_k{cosθ.at(index), sinθ.at(index)};
      Rotation2v θ_k_1{cosθ.at(index + 1), sinθ.at(index + 1)};

      Translation2v v_k{vx.at(index), vy.at(index)};
      Translation2v v_k_1{vx.at(index + 1), vy.at(index + 1)};

      auto ω_k = ω.at(index);
      auto ω_k_1 = ω.at(index + 1);

      Translation2v a_k{ax.at(index), ay.at(index)};
      Translation2v a_k_1{ax.at(index + 1), ay.at(index + 1)};

      auto α_k = α.at(index);
      auto α_k_1 = α.at(index + 1);

      // xₖ₊₁ = xₖ + vₖt + 1/2aₖt²
      // θₖ₊₁ = θₖ + ωₖt
      // vₖ₊₁ = vₖ + aₖt
      // ωₖ₊₁ = ωₖ + αₖt
      problem.SubjectTo(x_k_1 == x_k + v_k * dt + a_k * 0.5 * dt * dt);
      problem.SubjectTo((θ_k_1 - θ_k) == Rotation2v{ω_k * dt});
      problem.SubjectTo(v_k_1 == v_k + a_k * dt);
      problem.SubjectTo(ω_k_1 == ω_k + α_k * dt);
    }
  }

  for (size_t index = 0; index < sampTot; ++index) {
    Rotation2v θ_k{cosθ.at(index), sinθ.at(index)};
    Translation2v v_k{vx.at(index), vy.at(index)};

    // Solve for net force
    auto Fx_net = std::accumulate(Fx.at(index).begin(), Fx.at(index).end(),
                                  sleipnir::Variable{0.0});
    auto Fy_net = std::accumulate(Fy.at(index).begin(), Fy.at(index).end(),
                                  sleipnir::Variable{0.0});

    // Solve for net torque
    sleipnir::Variable τ_net = 0.0;
    for (size_t moduleIndex = 0; moduleIndex < path.drivetrain.modules.size();
         ++moduleIndex) {
      const auto& translation = path.drivetrain.modules.at(moduleIndex);
      auto r = translation.RotateBy(θ_k);
      Translation2v F{Fx.at(index).at(moduleIndex),
                      Fy.at(index).at(moduleIndex)};

      τ_net += r.Cross(F);
    }

    // Apply module power constraints
    auto vWrtRobot = v_k.RotateBy(-θ_k);
    for (size_t moduleIndex = 0; moduleIndex < path.drivetrain.modules.size();
         ++moduleIndex) {
      const auto& translation = path.drivetrain.modules.at(moduleIndex);

      Translation2v vWheelWrtRobot{
          vWrtRobot.X() - translation.Y() * ω.at(index),
          vWrtRobot.Y() + translation.X() * ω.at(index)};
      double maxWheelVelocity =
          path.drivetrain.wheelRadius * path.drivetrain.wheelMaxAngularVelocity;

      // |v|₂² ≤ vₘₐₓ²
      problem.SubjectTo(vWheelWrtRobot.SquaredNorm() <=
                        maxWheelVelocity * maxWheelVelocity);

      Translation2v moduleF{Fx.at(index).at(moduleIndex),
                            Fy.at(index).at(moduleIndex)};
      double maxForce =
          path.drivetrain.wheelMaxTorque / path.drivetrain.wheelRadius;

      // |F|₂² ≤ Fₘₐₓ²
      problem.SubjectTo(moduleF.SquaredNorm() <= maxForce * maxForce);
    }

    // Apply dynamics constraints
    //
    //   ΣF_xₖ = ma_xₖ
    //   ΣF_yₖ = ma_yₖ
    //   Στₖ = Jαₖ
    problem.SubjectTo(Fx_net == path.drivetrain.mass * ax.at(index));
    problem.SubjectTo(Fy_net == path.drivetrain.mass * ay.at(index));
    problem.SubjectTo(τ_net == path.drivetrain.moi * α.at(index));
  }

  for (size_t wptIndex = 0; wptIndex < wptCnt; ++wptIndex) {
    for (auto& constraint : path.waypoints.at(wptIndex).waypointConstraints) {
      // First index of next wpt - 1
      size_t index = GetIndex(Ns, wptIndex, 0);

      Pose2v pose_k{x.at(index), y.at(index), {cosθ.at(index), sinθ.at(index)}};
      Translation2v v_k{vx.at(index), vy.at(index)};
      auto ω_k = ω.at(index);
      Translation2v a_k{ax.at(index), ay.at(index)};
      auto α_k = α.at(index);

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
        Pose2v pose_k{
            x.at(index), y.at(index), {cosθ.at(index), sinθ.at(index)}};
        Translation2v v_k{vx.at(index), vy.at(index)};
        auto ω_k = ω.at(index);
        Translation2v a_k{ax.at(index), ay.at(index)};
        auto α_k = α.at(index);

        std::visit(
            [&](auto&& arg) { arg.Apply(problem, pose_k, v_k, ω_k, a_k, α_k); },
            constraint);
      }
    }
  }

  ApplyInitialGuess(initialGuess);
}

expected<SwerveSolution, sleipnir::SolverExitCondition>
SwerveTrajectoryGenerator::Generate(bool diagnostics) {
  GetCancellationFlag() = 0;
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
    return ConstructSwerveSolution();
  }
}

void SwerveTrajectoryGenerator::ApplyInitialGuess(
    const SwerveSolution& solution) {
  size_t sampleTotal = x.size();
  for (size_t sampleIndex = 0; sampleIndex < sampleTotal; ++sampleIndex) {
    x[sampleIndex].SetValue(solution.x[sampleIndex]);
    y[sampleIndex].SetValue(solution.y[sampleIndex]);
    cosθ[sampleIndex].SetValue(solution.thetacos[sampleIndex]);
    sinθ[sampleIndex].SetValue(solution.thetasin[sampleIndex]);
  }

  vx[0].SetValue(0.0);
  vy[0].SetValue(0.0);
  ω[0].SetValue(0.0);
  ax[0].SetValue(0.0);
  ay[0].SetValue(0.0);
  α[0].SetValue(0.0);

  for (size_t sampleIndex = 1; sampleIndex < sampleTotal; ++sampleIndex) {
    vx[sampleIndex].SetValue(
        (solution.x[sampleIndex] - solution.x[sampleIndex - 1]) /
        solution.dt[sampleIndex]);
    vy[sampleIndex].SetValue(
        (solution.y[sampleIndex] - solution.y[sampleIndex - 1]) /
        solution.dt[sampleIndex]);

    double cosθ = solution.thetacos[sampleIndex];
    double sinθ = solution.thetasin[sampleIndex];
    double last_cosθ = solution.thetacos[sampleIndex - 1];
    double last_sinθ = solution.thetasin[sampleIndex - 1];

    ω[sampleIndex].SetValue(Rotation2d{cosθ, sinθ}
                                .RotateBy(-Rotation2d{last_cosθ, last_sinθ})
                                .Radians() /
                            solution.dt[sampleIndex]);

    ax[sampleIndex].SetValue(
        (vx[sampleIndex].Value() - vx[sampleIndex - 1].Value()) /
        solution.dt[sampleIndex]);
    ay[sampleIndex].SetValue(
        (vy[sampleIndex].Value() - vy[sampleIndex - 1].Value()) /
        solution.dt[sampleIndex]);
    α[sampleIndex].SetValue(
        (ω[sampleIndex].Value() - ω[sampleIndex - 1].Value()) /
        solution.dt[sampleIndex]);
  }
}

SwerveSolution SwerveTrajectoryGenerator::ConstructSwerveSolution() {
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

  // TODO: Use std::ranges::to() from C++23
  auto matrixValue = [&](std::vector<std::vector<sleipnir::Variable>>& mat) {
    auto view =
        mat | std::views::transform([&](auto& v) {
          auto view2 = v | std::views::transform(getValue);
          return std::vector<double>{std::begin(view2), std::end(view2)};
        });
    return std::vector<std::vector<double>>{std::begin(view), std::end(view)};
  };

  return SwerveSolution{dtPerSample,       vectorValue(x),    vectorValue(y),
                        vectorValue(cosθ), vectorValue(sinθ), vectorValue(vx),
                        vectorValue(vy),   vectorValue(ω),    vectorValue(ax),
                        vectorValue(ay),   vectorValue(α),    matrixValue(Fx),
                        matrixValue(Fy)};
}

}  // namespace trajopt
