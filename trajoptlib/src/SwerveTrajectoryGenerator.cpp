// Copyright (c) TrajoptLib contributors

#include "trajopt/SwerveTrajectoryGenerator.hpp"

#include <stdint.h>

#include <algorithm>
#include <chrono>
#include <ranges>
#include <utility>

#include <sleipnir/optimization/OptimizationProblem.hpp>

#include "trajopt/util/Cancellation.hpp"
#include "trajopt/util/TrajoptUtil.hpp"

namespace trajopt {

SwerveTrajectoryGenerator::SwerveTrajectoryGenerator(
    SwervePathBuilder pathBuilder, int64_t handle)
    : path(pathBuilder.GetPath()), Ns(pathBuilder.GetControlIntervalCounts()) {
  auto initialGuess = pathBuilder.CalculateInitialGuess();

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
  size_t wptCnt = 1 + Ns.size();
  size_t sgmtCnt = Ns.size();
  size_t sampTot = GetIndex(Ns, wptCnt, 0);
  size_t moduleCnt = path.drivetrain.modules.size();

  x.reserve(sampTot);
  y.reserve(sampTot);
  thetacos.reserve(sampTot);
  thetasin.reserve(sampTot);
  vx.reserve(sampTot);
  vy.reserve(sampTot);
  omega.reserve(sampTot);
  ax.reserve(sampTot);
  ay.reserve(sampTot);
  alpha.reserve(sampTot);

  Fx.reserve(sampTot);
  Fy.reserve(sampTot);
  for (size_t sampIndex = 0; sampIndex < sampTot; ++sampIndex) {
    auto& _Fx = Fx.emplace_back();
    auto& _Fy = Fy.emplace_back();
    _Fx.reserve(moduleCnt);
    _Fy.reserve(moduleCnt);
  }

  dts.reserve(sgmtCnt);

  for (size_t index = 0; index < sampTot; ++index) {
    x.emplace_back(problem.DecisionVariable());
    y.emplace_back(problem.DecisionVariable());
    thetacos.emplace_back(problem.DecisionVariable());
    thetasin.emplace_back(problem.DecisionVariable());
    vx.emplace_back(problem.DecisionVariable());
    vy.emplace_back(problem.DecisionVariable());
    omega.emplace_back(problem.DecisionVariable());
    ax.emplace_back(problem.DecisionVariable());
    ay.emplace_back(problem.DecisionVariable());
    alpha.emplace_back(problem.DecisionVariable());

    for (size_t moduleIndex = 0; moduleIndex < moduleCnt; ++moduleIndex) {
      Fx.at(index).emplace_back(problem.DecisionVariable());
      Fy.at(index).emplace_back(problem.DecisionVariable());
    }
  }

  double minWidth = INFINITY;
  for (size_t i = 1; i < path.drivetrain.modules.size(); ++i) {
    if (std::abs(path.drivetrain.modules.at(i - 1).X() -
                 path.drivetrain.modules.at(i).X()) != 0) {
      minWidth =
          std::min(minWidth, std::abs(path.drivetrain.modules.at(i - 1).X() -
                                      path.drivetrain.modules.at(i).X()));
    }
    if (std::abs(path.drivetrain.modules.at(i - 1).Y() -
                 path.drivetrain.modules.at(i).Y()) != 0) {
      minWidth =
          std::min(minWidth, std::abs(path.drivetrain.modules.at(i - 1).Y() -
                                      path.drivetrain.modules.at(i).Y()));
    }
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
  for (size_t sgmtIndex = 0; sgmtIndex < Ns.size(); ++sgmtIndex) {
    auto& dt_sgmt = dts.at(sgmtIndex);
    auto N_sgmt = Ns.at(sgmtIndex);
    auto T_sgmt = dt_sgmt * static_cast<int>(N_sgmt);
    T_tot += T_sgmt;

    problem.SubjectTo(dt_sgmt >= 0);
    dt_sgmt.SetValue(5.0 / N_sgmt);
  }
  problem.Minimize(std::move(T_tot));

  // Apply kinematics constraints
  for (size_t wptIndex = 1; wptIndex < wptCnt; ++wptIndex) {
    size_t N_sgmt = Ns.at(wptIndex - 1);
    auto dt_sgmt = dts.at(wptIndex - 1);

    for (size_t sampIndex = 0; sampIndex < N_sgmt; ++sampIndex) {
      size_t index = GetIndex(Ns, wptIndex, sampIndex);

      Translation2v x_n{x.at(index), y.at(index)};
      Translation2v x_n_1{x.at(index - 1), y.at(index - 1)};

      Rotation2v theta_n{thetacos.at(index), thetasin.at(index)};
      Rotation2v theta_n_1{thetacos.at(index - 1), thetasin.at(index - 1)};

      Translation2v v_n{vx.at(index), vy.at(index)};
      Translation2v v_n_1{vx.at(index - 1), vy.at(index - 1)};

      auto omega_n = omega.at(index);
      auto omega_n_1 = omega.at(index - 1);

      Translation2v a_n{ax.at(index), ay.at(index)};
      auto alpha_n = alpha.at(index);

      problem.SubjectTo(x_n_1 + v_n * dt_sgmt + a_n * 0.5 * dt_sgmt * dt_sgmt ==
                        x_n);
      problem.SubjectTo((theta_n - theta_n_1) == Rotation2v{omega_n * dt_sgmt});
      problem.SubjectTo(v_n_1 + a_n * dt_sgmt == v_n);
      problem.SubjectTo(omega_n_1 + alpha_n * dt_sgmt == omega_n);
    }
  }

  for (size_t index = 0; index < sampTot; ++index) {
    Rotation2v theta{thetacos.at(index), thetasin.at(index)};
    Translation2v v{vx.at(index), vy.at(index)};

    // Solve for net force
    auto Fx_net = std::accumulate(Fx.at(index).begin(), Fx.at(index).end(),
                                  sleipnir::Variable{0.0});
    auto Fy_net = std::accumulate(Fy.at(index).begin(), Fy.at(index).end(),
                                  sleipnir::Variable{0.0});

    const auto& wheelRadius = path.drivetrain.wheelRadius;
    const auto& wheelMaxAngularVelocity =
        path.drivetrain.wheelMaxAngularVelocity;
    const auto& wheelMaxTorque = path.drivetrain.wheelMaxTorque;

    // Solve for net torque
    sleipnir::Variable tau_net = 0.0;
    for (size_t moduleIndex = 0; moduleIndex < path.drivetrain.modules.size();
         ++moduleIndex) {
      const auto& translation = path.drivetrain.modules.at(moduleIndex);
      auto r = translation.RotateBy(theta);
      Translation2v F{Fx.at(index).at(moduleIndex),
                      Fy.at(index).at(moduleIndex)};

      tau_net += r.Cross(F);
    }

    // Apply module power constraints
    auto vWrtRobot = v.RotateBy(-theta);
    for (size_t moduleIndex = 0; moduleIndex < path.drivetrain.modules.size();
         ++moduleIndex) {
      const auto& translation = path.drivetrain.modules.at(moduleIndex);

      Translation2v vWheelWrtRobot{
          vWrtRobot.X() - translation.Y() * omega.at(index),
          vWrtRobot.Y() + translation.X() * omega.at(index)};
      double maxWheelVelocity = wheelRadius * wheelMaxAngularVelocity;
      problem.SubjectTo(vWheelWrtRobot.SquaredNorm() <=
                        maxWheelVelocity * maxWheelVelocity);

      Translation2v moduleF{Fx.at(index).at(moduleIndex),
                            Fy.at(index).at(moduleIndex)};
      double maxForce = wheelMaxTorque / wheelRadius;
      problem.SubjectTo(moduleF.SquaredNorm() <= maxForce * maxForce);
    }

    // Apply dynamics constraints
    problem.SubjectTo(Fx_net == path.drivetrain.mass * ax.at(index));
    problem.SubjectTo(Fy_net == path.drivetrain.mass * ay.at(index));
    problem.SubjectTo(tau_net == path.drivetrain.moi * alpha.at(index));
  }

  for (size_t wptIndex = 0; wptIndex < wptCnt; ++wptIndex) {
    for (auto& constraint : path.waypoints.at(wptIndex).waypointConstraints) {
      // First index of next wpt - 1
      size_t index = GetIndex(Ns, wptIndex + 1, 0) - 1;

      Pose2v pose{
          x.at(index), y.at(index), {thetacos.at(index), thetasin.at(index)}};
      Translation2v linearVelocity{vx.at(index), vy.at(index)};
      auto angularVelocity = omega.at(index);
      Translation2v linearAcceleration{ax.at(index), ay.at(index)};
      auto angularAcceleration = alpha.at(index);

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
      size_t startIndex = GetIndex(Ns, sgmtIndex + 1, 0);
      size_t endIndex = GetIndex(Ns, sgmtIndex + 2, 0);

      for (size_t index = startIndex; index < endIndex; ++index) {
        Pose2v pose{
            x.at(index), y.at(index), {thetacos.at(index), thetasin.at(index)}};
        Translation2v linearVelocity{vx.at(index), vy.at(index)};
        auto angularVelocity = omega.at(index);
        Translation2v linearAcceleration{ax.at(index), ay.at(index)};
        auto angularAcceleration = alpha.at(index);

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

expected<SwerveSolution, std::string> SwerveTrajectoryGenerator::Generate(
    bool diagnostics) {
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
    return unexpected{std::string{sleipnir::ToMessage(status.exitCondition)}};
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
    thetacos[sampleIndex].SetValue(solution.thetacos[sampleIndex]);
    thetasin[sampleIndex].SetValue(solution.thetasin[sampleIndex]);
  }

  vx[0].SetValue(0.0);
  vy[0].SetValue(0.0);
  omega[0].SetValue(0.0);
  ax[0].SetValue(0.0);
  ay[0].SetValue(0.0);
  alpha[0].SetValue(0.0);

  for (size_t sampleIndex = 1; sampleIndex < sampleTotal; ++sampleIndex) {
    vx[sampleIndex].SetValue(
        (solution.x[sampleIndex] - solution.x[sampleIndex - 1]) /
        solution.dt[sampleIndex]);
    vy[sampleIndex].SetValue(
        (solution.y[sampleIndex] - solution.y[sampleIndex - 1]) /
        solution.dt[sampleIndex]);

    double thetacos = solution.thetacos[sampleIndex];
    double thetasin = solution.thetasin[sampleIndex];
    double last_thetacos = solution.thetacos[sampleIndex - 1];
    double last_thetasin = solution.thetasin[sampleIndex - 1];

    omega[sampleIndex].SetValue(
        Rotation2d{thetacos, thetasin}
            .RotateBy(-Rotation2d{last_thetacos, last_thetasin})
            .Radians() /
        solution.dt[sampleIndex]);

    ax[sampleIndex].SetValue(
        (vx[sampleIndex].Value() - vx[sampleIndex - 1].Value()) /
        solution.dt[sampleIndex]);
    ay[sampleIndex].SetValue(
        (vy[sampleIndex].Value() - vy[sampleIndex - 1].Value()) /
        solution.dt[sampleIndex]);
    alpha[sampleIndex].SetValue(
        (omega[sampleIndex].Value() - omega[sampleIndex - 1].Value()) /
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

  return SwerveSolution{
      dtPerSample,           vectorValue(x),        vectorValue(y),
      vectorValue(thetacos), vectorValue(thetasin), vectorValue(vx),
      vectorValue(vy),       vectorValue(omega),    vectorValue(ax),
      vectorValue(ay),       vectorValue(alpha),    matrixValue(Fx),
      matrixValue(Fy)};
}

}  // namespace trajopt
