// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <cmath>
#include <expected>
#include <utility>
#include <vector>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>

#include "trajopt/path/PathBuilder.hpp"
#include "trajopt/util/SymbolExports.hpp"

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

  /// The Coefficient of Friction (CoF) of the wheels.
  double wheelCoF;

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

  /// Heading.
  std::vector<double> heading;

  /// The left velocities.
  std::vector<double> vl;

  /// The right velocities.
  std::vector<double> vr;

  /// The chassis angular velocity, which can be derived as ω = (vᵣ −
  /// vₗ)/trackwidth
  std::vector<double> angularVelocity;

  /// The left accelerations.
  std::vector<double> al;

  /// The right acceleration.
  std::vector<double> ar;

  /// The force of the left driverail wheels.
  std::vector<double> Fl;

  /// The force of the right driverail wheels.
  std::vector<double> Fr;
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

  /// The chassis angular velocity.
  double angularVelocity = 0.0;

  /// The left wheel acceleration.
  double accelerationL = 0.0;

  /// The right wheel acceleration.
  double accelerationR = 0.0;

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
   * @param angularVelocity The chassis angular velocity.
   * @param accelerationL The left wheel acceleration.
   * @param accelerationR The right wheel acceleration.
   * @param forceL The left wheel force.
   * @param forceR The right wheel force.
   */
  DifferentialTrajectorySample(double timestamp, double x, double y,
                               double heading, double velocityL,
                               double velocityR, double angularVelocity,
                               double accelerationL, double accelerationR,
                               double forceL, double forceR)
      : timestamp{timestamp},
        x{x},
        y{y},
        heading{heading},
        velocityL{velocityL},
        velocityR{velocityR},
        angularVelocity{angularVelocity},
        accelerationL{accelerationL},
        accelerationR{accelerationR},
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
          ts, solution.x[sample], solution.y[sample], solution.heading[sample],
          solution.vl[sample], solution.vr[sample],
          solution.angularVelocity[sample], solution.al[sample],
          solution.ar[sample], solution.Fl[sample], solution.Fr[sample]);
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
  std::expected<DifferentialSolution, slp::ExitStatus> Generate(
      bool diagnostics = false);

 private:
  /// Differential path
  DifferentialPath path;

  /// State Variables
  std::vector<slp::Variable> x;
  std::vector<slp::Variable> y;
  std::vector<slp::Variable> θ;
  std::vector<slp::Variable> vl;
  std::vector<slp::Variable> vr;
  std::vector<slp::Variable> al;
  std::vector<slp::Variable> ar;

  /// Input Variables
  std::vector<slp::Variable> Fl;
  std::vector<slp::Variable> Fr;

  /// Time Variables
  std::vector<slp::Variable> dts;

  /// Discretization Constants
  std::vector<size_t> Ns;

  slp::Problem problem;

  void ApplyInitialGuess(const DifferentialSolution& solution);

  DifferentialSolution ConstructDifferentialSolution();
};

}  // namespace trajopt
