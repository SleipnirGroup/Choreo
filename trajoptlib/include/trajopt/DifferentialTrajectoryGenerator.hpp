// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <string>
#include <vector>

#include <sleipnir/autodiff/Variable.hpp>
#include <sleipnir/optimization/OptimizationProblem.hpp>

#include "path/Path.hpp"
#include "solution/DifferentialSolution.hpp"
#include "trajopt/TrajectoryGenerator.hpp"
#include "trajopt/path/DifferentialPathBuilder.hpp"
#include "trajopt/util/SymbolExports.hpp"
#include "trajopt/util/expected"

namespace trajopt {

/**
 * This trajectory generator class contains functions to generate
 * time-optimal trajectories for differential drivetrain types.
 */
class TRAJOPT_DLLEXPORT DifferentialTrajectoryGenerator
    : public TrajectoryGenerator {
 public:
  /**
   * Construct a new swerve trajectory optimization problem.
   *
   * @param pathBuilder The path builder.
   */
  explicit DifferentialTrajectoryGenerator(DifferentialPathBuilder pathBuilder);

  /**
   * Generates an optimal trajectory.
   *
   * This function may take a long time to complete.
   *
   * @param diagnostics Enables diagnostic prints.
   * @return Returns a holonomic trajectory on success, or a string containing a
   *   failure reason.
   */
  expected<DifferentialSolution, std::string> Generate(
      bool diagnostics = false);

 private:
  /// Differential path
  DifferentialPath path;

  /// Time Variables
  std::vector<sleipnir::Variable> dt;

  /// State Variables
  std::vector<sleipnir::Variable> x;
  std::vector<sleipnir::Variable> y;
  std::vector<sleipnir::Variable> thetacos;
  std::vector<sleipnir::Variable> thetasin;
  std::vector<sleipnir::Variable> vL;
  std::vector<sleipnir::Variable> vR;
  std::vector<sleipnir::Variable> tauL;
  std::vector<sleipnir::Variable> tauR;

  /// Discretization Constants
  std::vector<size_t> N;

  sleipnir::OptimizationProblem problem;

  void ApplyInitialGuess(const DifferentialSolution& solution);

  DifferentialSolution ConstructDifferentialSolution();
};

}  // namespace trajopt
