// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <functional>
#include <string>
#include <utility>
#include <vector>

#include <sleipnir/autodiff/Variable.hpp>
#include <sleipnir/optimization/OptimizationProblem.hpp>

#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/path/PathBuilder.hpp"
#include "trajopt/util/SymbolExports.hpp"
#include "trajopt/util/expected"

namespace trajopt {

/**
 * A swerve drivetrain physical model.
 */
struct TRAJOPT_DLLEXPORT SwerveDrivetrain {
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

  /// Translation of each swerve module from the origin of the robot coordinate
  /// system to the center of the module (m). There's usually one in each
  /// corner.
  std::vector<Translation2d> modules;
};

/**
 * The swerve drive trajectory optimization solution.
 */
struct TRAJOPT_DLLEXPORT SwerveSolution {
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

  /// The x velocities.
  std::vector<double> vx;

  /// The y velocities.
  std::vector<double> vy;

  /// The angular velocities.
  std::vector<double> omega;

  /// The x accelerations.
  std::vector<double> ax;

  /// The y accelerations.
  std::vector<double> ay;

  /// The angular accelerations.
  std::vector<double> alpha;

  /// The x forces for each module.
  std::vector<std::vector<double>> moduleFX;

  /// The y forces for each module.
  std::vector<std::vector<double>> moduleFY;
};

/**
 * Swerve trajectory sample.
 */
class TRAJOPT_DLLEXPORT SwerveTrajectorySample {
 public:
  /// The timestamp.
  double timestamp = 0.0;

  /// The x coordinate.
  double x = 0.0;

  /// The y coordinate.
  double y = 0.0;

  /// The heading.
  double heading = 0.0;

  /// The velocity's x component.
  double velocityX = 0.0;

  /// The velocity's y component.
  double velocityY = 0.0;

  /// The angular velocity.
  double angularVelocity = 0.0;

  /// The force on each module in the X direction.
  std::vector<double> moduleForcesX;

  /// The force on each module in the Y direction.
  std::vector<double> moduleForcesY;

  SwerveTrajectorySample() = default;

  /**
   * Construct a SwerveTrajectorySample.
   *
   * @param timestamp The timestamp.
   * @param x The x coordinate.
   * @param y The y coordinate.
   * @param heading The heading.
   * @param velocityX The velocity's x component.
   * @param velocityY The velocity's y component.
   * @param angularVelocity The angular velocity.
   * @param moduleForcesX Forces acting on the modules in the X direction.
   * @param moduleForcesY Forces acting on the modules in the Y direction.
   */
  SwerveTrajectorySample(double timestamp, double x, double y, double heading,
                         double velocityX, double velocityY,
                         double angularVelocity,
                         std::vector<double> moduleForcesX,
                         std::vector<double> moduleForcesY)
      : timestamp{timestamp},
        x{x},
        y{y},
        heading{heading},
        velocityX{velocityX},
        velocityY{velocityY},
        angularVelocity{angularVelocity},
        moduleForcesX{std::move(moduleForcesX)},
        moduleForcesY{std::move(moduleForcesY)} {}
};

/**
 * Swerve trajectory.
 */
class TRAJOPT_DLLEXPORT SwerveTrajectory {
 public:
  /// Trajectory samples.
  std::vector<SwerveTrajectorySample> samples;

  SwerveTrajectory() = default;

  /**
   * Construct a SwerveTrajectory from samples.
   *
   * @param samples The samples.
   */
  explicit SwerveTrajectory(std::vector<SwerveTrajectorySample> samples)
      : samples{std::move(samples)} {}

  /**
   * Construct a SwerveTrajectory from a swerve solution.
   *
   * @param solution The swerve solution.
   */
  explicit SwerveTrajectory(const SwerveSolution& solution) {
    double ts = 0.0;
    for (size_t sample = 0; sample < solution.x.size(); ++sample) {
      samples.emplace_back(
          ts, solution.x[sample], solution.y[sample],
          std::atan2(solution.thetasin[sample], solution.thetacos[sample]),
          solution.vx[sample], solution.vy[sample], solution.omega[sample],
          solution.moduleFX[sample], solution.moduleFY[sample]);
      ts += solution.dt[sample];
    }
  }
};

/**
 * A swerve path.
 */
using SwervePath = Path<SwerveDrivetrain, SwerveSolution>;

/**
 * Builds a swerve path using information about how the robot
 * must travel through a series of waypoints. This path can be converted
 * to a trajectory using SwerveTrajectoryGenerator.
 */
using SwervePathBuilder = PathBuilder<SwerveDrivetrain, SwerveSolution>;

/**
 * This trajectory generator class contains functions to generate
 * time-optimal trajectories for several drivetrain types.
 */
class TRAJOPT_DLLEXPORT SwerveTrajectoryGenerator {
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
  std::vector<sleipnir::Variable> dts;

  /// Discretization Constants
  std::vector<size_t> Ns;

  sleipnir::OptimizationProblem problem;
  std::vector<std::function<void()>> callbacks;

  void ApplyInitialGuess(const SwerveSolution& solution);

  SwerveSolution ConstructSwerveSolution();
};

}  // namespace trajopt
