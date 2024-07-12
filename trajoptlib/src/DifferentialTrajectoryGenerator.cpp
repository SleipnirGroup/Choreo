// Copyright (c) TrajoptLib contributors

#include "trajopt/DifferentialTrajectoryGenerator.hpp"

#include "trajopt/geometry/Rotation2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/TrajoptUtil.hpp"

namespace trajopt {

DifferentialTrajectoryGenerator::DifferentialTrajectoryGenerator(
    DifferentialPathBuilder pathbuilder)
    : path(pathbuilder.GetPath()), N(pathbuilder.GetControlIntervalCounts()) {
  auto initialGuess = pathbuilder.CalculateInitialGuess();

  size_t wptCnt = 1 + N.size();
  size_t sgmtCnt = N.size();
  size_t sampTot = GetIndex(N, wptCnt, 0);

  x.reserve(sampTot);
  y.reserve(sampTot);
  thetacos.reserve(sampTot);
  thetasin.reserve(sampTot);
  vL.reserve(sampTot);
  vR.reserve(sampTot);
  tauL.reserve(sampTot);
  tauR.reserve(sampTot);
  dt.reserve(sgmtCnt);

  for (size_t index = 0; index < sampTot; ++index) {
    x.emplace_back(problem.DecisionVariable());
    y.emplace_back(problem.DecisionVariable());
    thetacos.emplace_back(problem.DecisionVariable());
    thetasin.emplace_back(problem.DecisionVariable());
    vL.emplace_back(problem.DecisionVariable());
    vR.emplace_back(problem.DecisionVariable());
    tauL.emplace_back(problem.DecisionVariable());
    tauR.emplace_back(problem.DecisionVariable());
    dt.emplace_back(problem.DecisionVariable());
  }

  for (size_t sgmtIndex = 0; sgmtIndex < sgmtCnt; ++sgmtIndex) {
    for (auto& constraint :
         path.waypoints.at(sgmtIndex + 1).segmentConstraints) {
      size_t startIndex = GetIndex(N, sgmtIndex + 1, 0);
      size_t endIndex = GetIndex(N, sgmtIndex + 2, 0);

      for (size_t index = startIndex; index < endIndex; ++index) {
        Pose2v pose{
            x.at(index), y.at(index), {thetacos.at(index), thetasin.at(index)}};
        Translation2v linearVelocity{(vL.at(index) + vR.at(index)) / 2, 0.0};
        auto angularVelocity =
            (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;
        auto y_n1 = (y.size() > 0) ? y.at(index - 1) : 0;
        auto vL_n1 = ((vL.size() > 0) ? vL.at(index - 1) : 0);
        auto vR_n1 = ((vR.size() > 0) ? vR.at(index - 1) : 0);
        Translation2v linearAcceleration{
            ((vL.at(index) + vR.at(index)) / 2 - (vL_n1 + vR_n1) / 2) /
                dt.at(index),
            (y.at(index) - y_n1 / dt.at(index)) - y_n1 -
                ((y.size() > 1 && index >= 2) ? y.at(index - 2) : 0) /
                    dt.at(index)};
        auto angularAcceleration =
            (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth -
            (vR_n1 - vL_n1) / path.drivetrain.trackwidth / dt.at(index);

        std::visit(
            [&](auto&& arg) {
              arg.Apply(problem, pose, linearVelocity, angularVelocity,
                        linearAcceleration, angularAcceleration);
            },
            constraint);
      }
    }
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

      Translation2v v_n{(vL.at(index) + vR.at(index)) / 2, 0.0};
      Translation2v v_n_1{(vL.at(index - 1) + vR.at(index - 1)) / 2, 0.0};

      auto omega_n = (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;
      auto omega_n_1 =
          (vR.at(index - 1) - vL.at(index - 1)) / path.drivetrain.trackwidth;

      Translation2v a_n{((vL.at(index) + vR.at(index)) / 2 -
                         (vL.at(index - 1) + vR.at(index - 1)) / 2) /
                            dt.at(index),
                        0.0};
      auto alpha_n =
          (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth -
          (vR.at(index - 1) - vL.at(index - 1)) / path.drivetrain.trackwidth /
              dt.at(index);

      problem.SubjectTo(x_n_1 + v_n * dt_sgmt == x_n);
      problem.SubjectTo((theta_n - theta_n_1) == Rotation2v{omega_n * dt_sgmt});
      problem.SubjectTo(v_n_1 + a_n * dt_sgmt == v_n);
      problem.SubjectTo(omega_n_1 + alpha_n * dt_sgmt == omega_n);
    }
  }

  for (size_t index = 0; index < sampTot; ++index) {
    // Apply dynamics constraints
    problem.SubjectTo(tauL.at(index) == path.drivetrain.moi * vL.at(index));
    problem.SubjectTo(tauR.at(index) == path.drivetrain.moi * vR.at(index));
  }

  for (size_t wptIndex = 0; wptIndex < wptCnt; ++wptIndex) {
    for (auto& constraint : path.waypoints.at(wptIndex).waypointConstraints) {
      // First index of next wpt - 1
      size_t index = GetIndex(N, wptIndex + 1, 0) - 1;
      Pose2v pose{
          x.at(index), y.at(index), {thetacos.at(index), thetasin.at(index)}};
      Translation2v linearVelocity{(vL.at(index) + vR.at(index)) / 2, 0.0};
      auto angularVelocity =
          (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;
      Translation2v linearAcceleration{
          ((vL.at(index) + vR.at(index)) / 2 -
           (((index > 0) ? vL.at(index - 1) : 0.0) +
            ((index > 0) ? vR.at(index - 1) : 0.0)) /
               2) /
              dt.at(index),
          0.0};
      auto angularAcceleration =
          (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth -
          (((index > 0) ? vR.at(index - 1) : 0.0) -
           ((index > 0) ? vL.at(index - 1) : 0.0)) /
              path.drivetrain.trackwidth / dt.at(index);

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
        Translation2v linearVelocity{(vL.at(index) + vR.at(index)) / 2, 0.0};
        auto angularVelocity =
            (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth;
        Translation2v linearAcceleration{
            ((vL.at(index) + vR.at(index)) / 2 -
             (vL.at(index - 1) + vR.at(index - 1)) / 2) /
                dt.at(index),
            0.0};
        auto angularAcceleration =
            (vR.at(index) - vL.at(index)) / path.drivetrain.trackwidth -
            (vR.at(index - 1) - vL.at(index - 1)) / path.drivetrain.trackwidth /
                dt.at(index);

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
    dt[sampleIndex].SetValue(solution.dt[sampleIndex]);
    x[sampleIndex].SetValue(solution.x[sampleIndex]);
    y[sampleIndex].SetValue(solution.y[sampleIndex]);
    thetacos[sampleIndex].SetValue(solution.thetacos[sampleIndex]);
    thetasin[sampleIndex].SetValue(solution.thetasin[sampleIndex]);

    Translation2v linearVelocity{
        (x.at(sampleIndex) -
         ((sampleIndex > 0) ? x.at(sampleIndex - 1) : 0.0)) /
            dt.at(sampleIndex),
        (y.at(sampleIndex) -
         ((sampleIndex > 0) ? y.at(sampleIndex - 1) : 0.0)) /
            dt.at(sampleIndex)};
    Rotation2v angularVelocity{thetasin.at(sampleIndex),
                               thetacos.at(sampleIndex)};
    vL[sampleIndex].SetValue(
        (linearVelocity.X() +
         path.drivetrain.trackwidth / 2 * angularVelocity.Radians())
            .Value());
    vR[sampleIndex].SetValue(
        (linearVelocity.X() -
         path.drivetrain.trackwidth / 2 * angularVelocity.Radians())
            .Value());
    tauL[sampleIndex].SetValue(path.drivetrain.moi *
                               vL.at(sampleIndex).Value());
    tauR[sampleIndex].SetValue(path.drivetrain.moi *
                               vL.at(sampleIndex).Value());
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
      RowSolutionValue(tauL),
      RowSolutionValue(tauR),
  };
}

}  // namespace trajopt
