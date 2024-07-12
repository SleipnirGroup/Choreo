// Copyright (c) TrajoptLib contributors

#include "trajopt/DifferentialTrajectoryGenerator.hpp"

#include <string>

#include "trajopt/geometry/Rotation2.hpp"
#include "trajopt/solution/DifferentialSolution.hpp"
#include "trajopt/util/TrajoptUtil.hpp"
#include "trajopt/util/expected"

namespace trajopt {

DifferentialTrajectoryGenerator::DifferentialTrajectoryGenerator(
    DifferentialPathBuilder pathbuilder)
    : path(pathbuilder.GetPath()), N(pathbuilder.GetControlIntervalCounts()) {
  auto initialGuess = pathbuilder.CalculateInitialGuess();

  auto sgmtCnt = N.size();

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
        Translation2v linearAcceleration{((vL.at(index) + vR.at(index)) / 2 -
                                          (vL.at(index) + vR.at(index)) / 2) /
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
    vL[sampleIndex].SetValue(solution.vL[sampleIndex]);
    vR[sampleIndex].SetValue(solution.vR[sampleIndex]);
    tauL[sampleIndex].SetValue(solution.tauL[sampleIndex]);
    tauR[sampleIndex].SetValue(solution.tauR[sampleIndex]);
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
