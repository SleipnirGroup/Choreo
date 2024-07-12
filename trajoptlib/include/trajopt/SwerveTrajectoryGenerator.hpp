// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <functional>
#include <string>
#include <vector>

#include <sleipnir/optimization/OptimizationProblem.hpp>

#include "trajopt/TrajectoryGenerator.hpp"
#include "trajopt/path/SwervePathBuilder.hpp"
#include "trajopt/solution/SwerveSolution.hpp"
#include "trajopt/util/SymbolExports.hpp"
#include "trajopt/util/expected"

namespace trajopt {

/**
 * This trajectory generator class contains functions to generate
 * time-optimal trajectories for several drivetrain types.
 */
class TRAJOPT_DLLEXPORT SwerveTrajectoryGenerator : TrajectoryGenerator {
 public:
  /**
   * Construct a new swerve trajectory optimization problem.
   *
   * @param pathBuilder The path builder.
   * @param handle An identifier for state callbacks.
   */
  explicit SwerveTrajectoryGenerator(SwervePathBuilder pathBuilder,
                                     int64_t handle = 0);

  /**
   * Generates an optimal trajectory.
   *
   * This function may take a long time to complete.
   *
   * @param diagnostics Enables diagnostic prints.
   * @return Returns a holonomic trajectory on success, or a string containing a
   *   failure reason.
   */
  expected<SwerveSolution, std::string> Generate(bool diagnostics = false);

 private:
  /// Swerve path
  SwervePath path;

  /// State Variables
  std::vector<sleipnir::Variable> x;
  std::vector<sleipnir::Variable> y;
  std::vector<sleipnir::Variable> thetacos;
  std::vector<sleipnir::Variable> thetasin;
  std::vector<sleipnir::Variable> vx;
  std::vector<sleipnir::Variable> vy;
  std::vector<sleipnir::Variable> omega;
  std::vector<sleipnir::Variable> ax;
  std::vector<sleipnir::Variable> ay;
  std::vector<sleipnir::Variable> alpha;

  /// Input Variables
  std::vector<std::vector<sleipnir::Variable>> Fx;
  std::vector<std::vector<sleipnir::Variable>> Fy;

  /// Time Variables
  std::vector<sleipnir::Variable> dt;

  /// Discretization Constants
  std::vector<size_t> N;

  sleipnir::OptimizationProblem problem;
  std::vector<std::function<void()>> callbacks;

  void ApplyInitialGuess(const SwerveSolution& solution);

  SwerveSolution ConstructSwerveSolution();
};

}  // namespace trajopt
