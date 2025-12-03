// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <expected>
#include <utility>
#include <vector>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>

#include "trajopt/path/path_builder.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// A differential drivetrain physical model.
struct TRAJOPT_DLLEXPORT DifferentialDrivetrain {
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

  /// Distance between the two driverails (m).
  double trackwidth;
};

/// The holonomic trajectory optimization solution.
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
  /// vₗ)/trackwidth.
  std::vector<double> angular_velocity;

  /// The left accelerations.
  std::vector<double> al;

  /// The right acceleration.
  std::vector<double> ar;

  /// The chassis angular acceleration, which can be derived as α = (aᵣ −
  /// aₗ)/trackwidth.
  std::vector<double> angular_acceleration;

  /// The force of the left driverail wheels.
  std::vector<double> Fl;

  /// The force of the right driverail wheels.
  std::vector<double> Fr;
};

/// Differential trajectory sample.
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
  double velocity_l = 0.0;

  /// The right wheel velocity.
  double velocity_r = 0.0;

  /// The chassis angular velocity.
  double angular_velocity = 0.0;

  /// The left wheel acceleration.
  double acceleration_l = 0.0;

  /// The right wheel acceleration.
  double acceleration_r = 0.0;

  /// The chassis angular acceleration.
  double angular_acceleration = 0.0;

  /// The left wheel force.
  double force_l = 0.0;

  /// The right wheel force.
  double force_r = 0.0;

  DifferentialTrajectorySample() = default;

  /// Construct a DifferentialTrajectorySample.
  ///
  /// @param timestamp The timestamp.
  /// @param x The x coordinate. @param y The y coordinate.
  /// @param heading The heading.
  /// @param velocity_l The left wheel velocity.
  /// @param velocity_r The right wheel velocity.
  /// @param angular_velocity The chassis angular velocity.
  /// @param acceleration_l The left wheel acceleration.
  /// @param acceleration_r The right wheel acceleration.
  /// @param angular_acceleration The chassis angular acceleration.
  /// @param force_l The left wheel force.
  /// @param force_r The right wheel force.
  DifferentialTrajectorySample(double timestamp, double x, double y,
                               double heading, double velocity_l,
                               double velocity_r, double angular_velocity,
                               double acceleration_l, double acceleration_r,
                               double angular_acceleration, double force_l,
                               double force_r)
      : timestamp{timestamp},
        x{x},
        y{y},
        heading{heading},
        velocity_l{velocity_l},
        velocity_r{velocity_r},
        angular_velocity{angular_velocity},
        acceleration_l{acceleration_l},
        acceleration_r{acceleration_r},
        angular_acceleration{angular_acceleration},
        force_l{force_l},
        force_r{force_r} {}
};

/// Differential trajectory.
class TRAJOPT_DLLEXPORT DifferentialTrajectory {
 public:
  /// Trajectory samples.
  std::vector<DifferentialTrajectorySample> samples;

  DifferentialTrajectory() = default;

  /// Construct a DifferentialTrajectory from samples.
  ///
  /// @param samples The samples.
  explicit DifferentialTrajectory(
      std::vector<DifferentialTrajectorySample> samples)
      : samples{std::move(samples)} {}

  /// Construct a DifferentialTrajectory from a swerve solution.
  ///
  /// @param solution The swerve solution.
  explicit DifferentialTrajectory(const DifferentialSolution& solution) {
    double ts = 0.0;
    for (size_t sample = 0; sample < solution.x.size(); ++sample) {
      samples.emplace_back(
          ts, solution.x[sample], solution.y[sample], solution.heading[sample],
          solution.vl[sample], solution.vr[sample],
          solution.angular_velocity[sample], solution.al[sample],
          solution.ar[sample], solution.angular_acceleration[sample],
          solution.Fl[sample], solution.Fr[sample]);
      ts += solution.dt[sample];
    }
  }
};

/// A differential drive path.
using DifferentialPath = Path<DifferentialDrivetrain, DifferentialSolution>;

/// Builds a differential drive path using information about how the robot
/// must travel through a series of waypoints. This path can be converted
/// to a trajectory using DifferentialTrajectoryGenerator.
using DifferentialPathBuilder =
    PathBuilder<DifferentialDrivetrain, DifferentialSolution>;

/// This trajectory generator class contains functions to generate
/// time-optimal trajectories for differential drivetrain types.
class TRAJOPT_DLLEXPORT DifferentialTrajectoryGenerator {
 public:
  /// Construct a new swerve trajectory optimization problem.
  ///
  /// @param path_builder The path builder.
  /// @param handle An identifier for state callbacks.
  explicit DifferentialTrajectoryGenerator(DifferentialPathBuilder path_builder,
                                           int64_t handle = 0);

  /// Generates an optimal trajectory.
  ///
  /// This function may take a long time to complete.
  ///
  /// @param diagnostics Enables diagnostic prints.
  /// @return Returns a differential trajectory on success, or the solver's exit
  ///     status on failure.
  std::expected<DifferentialSolution, slp::ExitStatus> generate(
      bool diagnostics = false);

 private:
  /// Differential path
  DifferentialPath path;

  /// State Variables
  std::vector<slp::Variable<double>> x;
  std::vector<slp::Variable<double>> y;
  std::vector<slp::Variable<double>> θ;
  std::vector<slp::Variable<double>> vl;
  std::vector<slp::Variable<double>> vr;
  std::vector<slp::Variable<double>> al;
  std::vector<slp::Variable<double>> ar;

  /// Input Variables
  std::vector<slp::Variable<double>> Fl;
  std::vector<slp::Variable<double>> Fr;

  /// Time Variables
  std::vector<slp::Variable<double>> dts;

  /// Discretization Constants
  std::vector<size_t> Ns;

  slp::Problem<double> problem;

  void apply_initial_guess(const DifferentialSolution& solution);

  DifferentialSolution construct_differential_solution();
};

}  // namespace trajopt
