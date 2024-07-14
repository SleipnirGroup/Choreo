// Copyright (c) TrajoptLib contributors

#include "trajopt/DifferentialTrajectoryGenerator.hpp"

#include "trajopt/geometry/Rotation2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/Cancellation.hpp"
#include "trajopt/util/TrajoptUtil.hpp"

namespace trajopt {

DifferentialTrajectoryGenerator::DifferentialTrajectoryGenerator(
    DifferentialPathBuilder pathbuilder, int64_t handle)
    : path(pathbuilder.GetPath()), N(pathbuilder.GetControlIntervalCounts()) {
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
  size_t wptCnt = 1 + N.size();
  size_t sgmtCnt = N.size();
  size_t sampTot = GetIndex(N, wptCnt, 0);

  x.reserve(sampTot);
  y.reserve(sampTot);
  thetacos.reserve(sampTot);
  thetasin.reserve(sampTot);
  vL.reserve(sampTot);
  vR.reserve(sampTot);
  aL.reserve(sampTot);
  aR.reserve(sampTot);

  FL.reserve(sampTot);
  FR.reserve(sampTot);

  dt.reserve(sgmtCnt);

  for (size_t index = 0; index < sampTot; ++index) {
    x.emplace_back(problem.DecisionVariable());
    y.emplace_back(problem.DecisionVariable());
    thetacos.emplace_back(problem.DecisionVariable());
    thetasin.emplace_back(problem.DecisionVariable());
    vL.emplace_back(problem.DecisionVariable());
    vR.emplace_back(problem.DecisionVariable());
    aL.emplace_back(problem.DecisionVariable());
    aR.emplace_back(problem.DecisionVariable());

    FL.emplace_back(problem.DecisionVariable());
    FR.emplace_back(problem.DecisionVariable());
  }

  double minWidth = path.drivetrain.trackwidth;

  for (size_t sgmtIndex = 0; sgmtIndex < sgmtCnt; ++sgmtIndex) {
    dt.emplace_back(problem.DecisionVariable());
    problem.SubjectTo(dt.at(sgmtIndex) * path.drivetrain.left.wheelRadius *
                          path.drivetrain.left.wheelMaxAngularVelocity <=
                      minWidth);
    problem.SubjectTo(dt.at(sgmtIndex) * path.drivetrain.right.wheelRadius *
                          path.drivetrain.right.wheelMaxAngularVelocity <=
                      minWidth);
  }

  // Minimize total time
  sleipnir::Variable T_tot = 0;
  for (size_t sgmtIndex = 0; sgmtIndex < N.size(); ++sgmtIndex) {
    auto& dt_sgmt = dt.at(sgmtIndex);
    auto N_sgmt = N.at(sgmtIndex);
    auto T_sgmt = dt_sgmt * static_cast<int>(N_sgmt);
    T_tot += T_sgmt;

    problem.SubjectTo(dt_sgmt >= 0);
    dt_sgmt.SetValue(5.0 / N_sgmt);
  }
  problem.Minimize(std::move(T_tot));

  // Apply kinematics constraints
  for (size_t wptIndex = 1; wptIndex < wptCnt; ++wptIndex) {
    size_t N_sgmt = N.at(wptIndex - 1);
    auto dt_sgmt = dt.at(wptIndex - 1);

    for (size_t sampIndex = 0; sampIndex < N_sgmt; ++sampIndex) {
      size_t index = GetIndex(N, wptIndex, sampIndex);

      Translation2v x_n{x.at(index), y.at(index)};
      Translation2v x_n_1{x.at(index - 1), y.at(index - 1)};

      Rotation2v theta_n{thetacos.at(index), thetasin.at(index)};
      Rotation2v theta_n_1{thetacos.at(index - 1), thetasin.at(index - 1)};

      Translation2v v_n{vL.at(index), vR.at(index)};
      v_n = v_n.RotateBy(theta_n);
      Translation2v v_n_1{vL.at(index - 1), vR.at(index - 1)};
      v_n_1 = v_n_1.RotateBy(theta_n_1);

      auto omega_n = (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;
      auto omega_n_1 =
          (vR.at(index - 1) - vL.at(index - 1)) / path.drivetrain.trackwidth;

      Translation2v a_n{aL.at(index), aR.at(index)};

      problem.SubjectTo(x_n_1 + v_n * dt_sgmt == x_n);
      problem.SubjectTo((theta_n - theta_n_1) == Rotation2v{omega_n * dt_sgmt});
      problem.SubjectTo(v_n_1 + a_n * dt_sgmt == v_n);
    }
  }

  for (size_t index = 0; index < sampTot; ++index) {
    Rotation2v theta{thetacos.at(index), thetasin.at(index)};
    Translation2v v{vL.at(index), vR.at(index)};
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
      const auto& [wheelRadius, wheelMaxAngularVelocity, wheelMaxTorque] =
          path.drivetrain.left;

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
      size_t index = GetIndex(N, wptIndex + 1, 0) - 1;

      Pose2v pose{
          x.at(index), y.at(index), {thetacos.at(index), thetasin.at(index)}};

      auto v = (vL.at(index) + vR.at(index)) / 2.0;
      Translation2v linearVelocity{v * thetacos.at(index),
                                   v * thetasin.at(index)};

      auto angularVelocity =
          (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;

      auto a = (aL.at(index) + aR.at(index)) / 2.0;
      Translation2v linearAcceleration{a * thetacos.at(index),
                                       a * thetasin.at(index)};

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
      size_t startIndex = GetIndex(N, sgmtIndex + 1, 0);
      size_t endIndex = GetIndex(N, sgmtIndex + 2, 0);

      for (size_t index = startIndex; index < endIndex; ++index) {
        Pose2v pose{
            x.at(index), y.at(index), {thetacos.at(index), thetasin.at(index)}};

        auto v = (vL.at(index) + vR.at(index)) / 2.0;
        Translation2v linearVelocity{v * thetacos.at(index),
                                     v * thetasin.at(index)};

        auto angularVelocity =
            (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;

        auto a = (aL.at(index) + aR.at(index)) / 2.0;
        Translation2v linearAcceleration{a * thetacos.at(index),
                                         a * thetasin.at(index)};

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

expected<DifferentialSolution, std::string>
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
    return unexpected{std::string{sleipnir::ToMessage(status.exitCondition)}};
  } else {
    return ConstructDifferentialSolution();
  }
}

void DifferentialTrajectoryGenerator::ApplyInitialGuess(
    const DifferentialSolution& solution) {
  size_t sampleTotal = x.size();
  for (size_t sampleIndex = 0; sampleIndex < sampleTotal; sampleIndex++) {
    x[sampleIndex].SetValue(solution.x[sampleIndex]);
    y[sampleIndex].SetValue(solution.y[sampleIndex]);
    thetacos[sampleIndex].SetValue(solution.thetacos[sampleIndex]);
    thetasin[sampleIndex].SetValue(solution.thetasin[sampleIndex]);
  }

  vL[0].SetValue(0.0);
  vR[0].SetValue(0.0);
  aL[0].SetValue(0.0);
  aR[0].SetValue(0.0);

  for (size_t sampleIndex = 1; sampleIndex < sampleTotal; sampleIndex++) {
    double linearVelocity =
        std::hypot(solution.x[sampleIndex] - solution.x[sampleIndex - 1],
                   solution.y[sampleIndex] - solution.y[sampleIndex - 1]) /
        solution.dt[sampleIndex];
    double thetacos = solution.thetacos[sampleIndex];
    double thetasin = solution.thetasin[sampleIndex];
    double last_thetacos = solution.thetacos[sampleIndex - 1];
    double last_thetasin = solution.thetasin[sampleIndex - 1];

    double omega = Rotation2d{thetacos, thetasin}
                       .RotateBy(-Rotation2d{last_thetacos, last_thetasin})
                       .Radians() /
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
  std::vector<double> dtPerSamp;
  for (size_t sgmtIndex = 0; sgmtIndex < N.size(); ++sgmtIndex) {
    size_t N_sgmt = N.at(sgmtIndex);
    sleipnir::Variable dt_sgmt = dt.at(sgmtIndex);
    double dt_val = dt_sgmt.Value();
    for (size_t i = 0; i < N_sgmt; ++i) {
      dtPerSamp.push_back(dt_val);
    }
  }

  return DifferentialSolution{
      dtPerSamp,
      RowSolutionValue(x),
      RowSolutionValue(y),
      RowSolutionValue(thetacos),
      RowSolutionValue(thetasin),
      RowSolutionValue(vL),
      RowSolutionValue(vR),
      RowSolutionValue(FL),
      RowSolutionValue(FR),
  };
}

}  // namespace trajopt
