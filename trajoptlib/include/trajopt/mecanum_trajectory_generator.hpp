// Copyright (c) TrajoptLib contributors

#pragma once

#include <expected>
#include <utility>
#include <vector>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>

#include "trajopt/geometry/translation2.hpp"
#include "trajopt/path/path_builder.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// A mecanum drivetrain physical model.
struct TRAJOPT_DLLEXPORT MecanumDrivetrain {
  /// The mass of the robot (kg).
  double mass;

  /// The moment of inertia of the robot about the origin (kg−m²).
  double moi;

  /// Radius of wheel (m).
  double wheel_radius;

  /// Maximum angular velocity of wheel (rad/s).
  double wheel_max_angular_velocity;

  /// Maximum torque applied to wheel (N−m).
  double wheel_max_torque;

  /// The Coefficient of Friction (CoF) of the wheels.
  double wheel_cof;

  /// Strafing efficiency [0 -> 1] penalizes strafing by a certain percent.
  double strafe_efficiency = 0.75;

  /// Translation of each wheel from the origin of the robot coordinate
  /// system to the center of the wheel (m).
  std::vector<Translation2d> wheels;
};

/// The mecanum drive trajectory optimization solution.
struct TRAJOPT_DLLEXPORT MecanumSolution {
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

  /// The forces along the active axis of each wheel.
  std::vector<std::vector<double>> wheel_f;
};

/// Mecanum drive trajectory sample.
class TRAJOPT_DLLEXPORT MecanumTrajectorySample {
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
  double velocity_x = 0.0;

  /// The velocity's y component.
  double velocity_y = 0.0;

  /// The angular velocity.
  double angular_velocity = 0.0;

  /// The acceleration's x component.
  double acceleration_x = 0.0;

  /// The acceleration's y component.
  double acceleration_y = 0.0;

  /// The angular acceleration.
  double angular_acceleration = 0.0;

  /// The force on each wheel along its active axis.
  std::vector<double> wheel_forces;

  MecanumTrajectorySample() = default;

  /// Construct a MecanumTrajectorySample.
  ///
  /// @param timestamp The timestamp.
  /// @param x The x coordinate.
  /// @param y The y coordinate.
  /// @param heading The heading.
  /// @param velocity_x The velocity's x component.
  /// @param velocity_y The velocity's y component.
  /// @param angular_velocity The angular velocity.
  /// @param acceleration_x The acceleration's x component.
  /// @param acceleration_y The acceleration's y component.
  /// @param angular_acceleration The angular acceleration.
  /// @param wheel_forces Forces along the wheel directions.
  MecanumTrajectorySample(double timestamp, double x, double y, double heading,
                          double velocity_x, double velocity_y,
                          double angular_velocity, double acceleration_x,
                          double acceleration_y, double angular_acceleration,
                          std::vector<double> wheel_forces)
      : timestamp{timestamp},
        x{x},
        y{y},
        heading{heading},
        velocity_x{velocity_x},
        velocity_y{velocity_y},
        angular_velocity{angular_velocity},
        acceleration_x{acceleration_x},
        acceleration_y{acceleration_y},
        angular_acceleration{angular_acceleration},
        wheel_forces{std::move(wheel_forces)} {}
};

/// Mecanum trajectory.
class TRAJOPT_DLLEXPORT MecanumTrajectory {
 public:
  /// Trajectory samples.
  std::vector<MecanumTrajectorySample> samples;

  MecanumTrajectory() = default;

  /// Construct a MecanumTrajectory from samples.
  ///
  /// @param samples The samples.
  explicit MecanumTrajectory(std::vector<MecanumTrajectorySample> samples)
      : samples{std::move(samples)} {}

  /// Construct a MecanumTrajectory from a swerve solution.
  ///
  /// @param solution The swerve solution.
  explicit MecanumTrajectory(const MecanumSolution& solution) {
    double ts = 0.0;
    for (size_t sample = 0; sample < solution.x.size(); ++sample) {
      samples.emplace_back(
          ts, solution.x[sample], solution.y[sample],
          std::atan2(solution.thetasin[sample], solution.thetacos[sample]),
          solution.vx[sample], solution.vy[sample], solution.omega[sample],
          solution.ax[sample], solution.ay[sample], solution.alpha[sample],
          solution.wheel_f[sample]);
      ts += solution.dt[sample];
    }
  }
};

/// A mecanum path.
using MecanumPath = Path<MecanumDrivetrain, MecanumSolution>;

/// Builds a mecanum path using information about how the robot must travel
/// through a series of waypoints. This path can be converted to a trajectory
/// using MecanumTrajectoryGenerator.
using MecanumPathBuilder = PathBuilder<MecanumDrivetrain, MecanumSolution>;

/// This trajectory generator class contains functions to generate time-optimal
/// trajectories for several drivetrain types.
class TRAJOPT_DLLEXPORT MecanumTrajectoryGenerator {
 public:
  /// Construct a new swerve trajectory optimization problem.
  ///
  /// @param path_builder The path builder.
  /// @param handle An identifier for state callbacks.
  explicit MecanumTrajectoryGenerator(MecanumPathBuilder path_builder,
                                      int64_t handle = 0);

  /// Generates an optimal trajectory.
  ///
  /// This function may take a long time to complete.
  ///
  /// @param diagnostics Enables diagnostic prints.
  /// @return Returns a holonomic trajectory on success, or the solver's exit
  ///     status on failure.
  std::expected<MecanumSolution, slp::ExitStatus> generate(
      bool diagnostics = false);

 private:
  /// Mecanum path
  MecanumPath path;

  /// State Variables
  std::vector<slp::Variable<double>> x;
  std::vector<slp::Variable<double>> y;
  std::vector<slp::Variable<double>> cosθ;
  std::vector<slp::Variable<double>> sinθ;
  std::vector<slp::Variable<double>> vx;
  std::vector<slp::Variable<double>> vy;
  std::vector<slp::Variable<double>> ω;
  std::vector<slp::Variable<double>> ax;
  std::vector<slp::Variable<double>> ay;
  std::vector<slp::Variable<double>> α;

  /// Input Variables
  std::vector<std::vector<slp::Variable<double>>> F;

  /// Time Variables
  std::vector<slp::Variable<double>> dts;

  /// Discretization Constants
  std::vector<size_t> Ns;

  slp::Problem<double> problem;

  void apply_initial_guess(const MecanumSolution& solution);

  MecanumSolution construct_mecanum_solution();
};

}  // namespace trajopt
