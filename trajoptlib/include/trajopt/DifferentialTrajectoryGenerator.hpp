// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <cmath>
#include <functional>
#include <string>
#include <utility>
#include <vector>

#include <sleipnir/autodiff/Variable.hpp>
#include <sleipnir/optimization/OptimizationProblem.hpp>

#include "trajopt/path/PathBuilder.hpp"
#include "trajopt/util/SymbolExports.hpp"
#include "trajopt/util/expected"

namespace trajopt {

/**
 * A differential drivetrain physical model.
 */
struct TRAJOPT_DLLEXPORT DifferentialDrivetrain {
  /// The mass of the robot (kg).
  double mass;

  /// The moment of inertia of the robot about the origin (kg−m²).
  double moi;

  /// Radius of wheel (m).
  double wheelRadius;

  /// Maximum angular velocity of wheel (rad/s).
  double wheelMaxAngularVelocity;

  /// Maximum torque applied to wheel (N−m).
  double wheelMaxTorque;

  /// Distance between the two driverails (m).
  double trackwidth;
};

/**
 * The holonomic trajectory optimization solution.
 */
struct TRAJOPT_DLLEXPORT DifferentialSolution {
  /// Times between samples.
  std::vector<double> dt;

  /// X positions.
  std::vector<double> x;

  /// Y positions.
  std::vector<double> y;

  /// Heading cosine.
  std::vector<double> thetacos;

  /// Heading sine.
  std::vector<double> thetasin;

  /// The left velocities.
  std::vector<double> vL;

  /// The right velocities.
  std::vector<double> vR;

  /// The force of the left driverail wheels.
  std::vector<double> FL;

  /// The force of the right driverail wheels.
  std::vector<double> FR;
};

/**
 * Differential trajectory sample.
 */
class TRAJOPT_DLLEXPORT DifferentialTrajectorySample {
 public:
  /// The timestamp.
  double timestamp = 0.0;

  /// The x coordinate.
  double x = 0.0;

  /// The y coordinate.
  double y = 0.0;

  /// The heading.
  double heading = 0.0;

  /// The left wheel velocity.
  double velocityL = 0.0;

  /// The right wheel velocity.
  double velocityR = 0.0;

  /// The left wheel force.
  double forceL = 0.0;

  /// The right wheel force.
  double forceR = 0.0;

  DifferentialTrajectorySample() = default;

  /**
   * Construct a DifferentialTrajectorySample.
   *
   * @param timestamp The timestamp.
   * @param x The x coordinate. @param y The y coordinate.
   * @param heading The heading.
   * @param velocityL The left wheel velocity.
   * @param velocityR The right wheel velocity.
   * @param forceL The left wheel force.
   * @param forceR The right wheel force.
   */
  DifferentialTrajectorySample(double timestamp, double x, double y,
                               double heading, double velocityL,
                               double velocityR, double forceL, double forceR)
      : timestamp{timestamp},
        x{x},
        y{y},
        heading{heading},
        velocityL{velocityL},
        velocityR{velocityR},
        forceL{forceL},
        forceR{forceR} {}
};

/**
 * Differential trajectory.
 */
class TRAJOPT_DLLEXPORT DifferentialTrajectory {
 public:
  /// Trajectory samples.
  std::vector<DifferentialTrajectorySample> samples;

  DifferentialTrajectory() = default;

  /**
   * Construct a DifferentialTrajectory from samples.
   *
   * @param samples The samples.
   */
  explicit DifferentialTrajectory(
      std::vector<DifferentialTrajectorySample> samples)
      : samples{std::move(samples)} {}

  /**
   * Construct a DifferentialTrajectory from a swerve solution.
   *
   * @param solution The swerve solution.
   */
  explicit DifferentialTrajectory(const DifferentialSolution& solution) {
    double ts = 0.0;
    for (size_t sample = 0; sample < solution.x.size(); ++sample) {
      samples.emplace_back(
          ts, solution.x[sample], solution.y[sample],
          std::atan2(solution.thetasin[sample], solution.thetacos[sample]),
          solution.vL[sample], solution.vR[sample], solution.FL[sample],
          solution.FR[sample]);
      ts += solution.dt[sample];
    }
  }
};

/**
 * A differential drive path.
 */
using DifferentialPath = Path<DifferentialDrivetrain, DifferentialSolution>;

/**
 * Builds a differential drive path using information about how the robot
 * must travel through a series of waypoints. This path can be converted
 * to a trajectory using DifferentialTrajectoryGenerator.
 */
using DifferentialPathBuilder =
    PathBuilder<DifferentialDrivetrain, DifferentialSolution>;

/**
 * This trajectory generator class contains functions to generate
 * time-optimal trajectories for differential drivetrain types.
 */
class TRAJOPT_DLLEXPORT DifferentialTrajectoryGenerator {
 public:
  /**
   * Construct a new swerve trajectory optimization problem.
   *
   * @param pathBuilder The path builder.
   * @param handle An identifier for state callbacks.
   */
  explicit DifferentialTrajectoryGenerator(DifferentialPathBuilder pathBuilder,
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
  expected<DifferentialSolution, std::string> Generate(
      bool diagnostics = false);

 private:
  /// Differential path
  DifferentialPath path;

  /// State Variables
  std::vector<sleipnir::Variable> x;
  std::vector<sleipnir::Variable> y;
  std::vector<sleipnir::Variable> thetacos;
  std::vector<sleipnir::Variable> thetasin;
  std::vector<sleipnir::Variable> vL;
  std::vector<sleipnir::Variable> vR;
  std::vector<sleipnir::Variable> aL;
  std::vector<sleipnir::Variable> aR;

  /// Input Variables
  std::vector<sleipnir::Variable> FL;
  std::vector<sleipnir::Variable> FR;

  /// Time Variables
  std::vector<sleipnir::Variable> dts;

  /// Discretization Constants
  std::vector<size_t> Ns;

  sleipnir::OptimizationProblem problem;
  std::vector<std::function<void()>> callbacks;

  void ApplyInitialGuess(const DifferentialSolution& solution);

  DifferentialSolution ConstructDifferentialSolution();
};

}  // namespace trajopt
