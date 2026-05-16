// Copyright (c) TrajoptLib contributors

#include <numbers>
#include <print>

#include <sleipnir/optimization/solver/exit_status.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#include <wpi/util/json.hpp>
// SwervePathBuilder is used to build paths that are optimized into full
// trajectories.
//
// "Wpt" stands for waypoint, an instantaneous moment in the path where certain
// constrains on the robot's state are applied.
//
// "Sgmt" is the abbreviation for segments, the continuum of state between
// waypoints where constraints can also be applied.

int main() {
  std::println("Running Choreo Core TrajoptLib examples...");
  auto update =
            wpi::util::json::object("persistent", wpi::util::json::object());
  std::println("Update: {}", std::string(update));
  trajopt::SwerveDrivetrain swerve_drivetrain{
      // kg
      .mass = 45,
      // kg-m²
      .moi = 6,
      // m
      .wheel_radius = 0.04,
      // rad/s
      .wheel_max_angular_velocity = 70,
      // N-m
      .wheel_max_torque = 2,
      // unitless
      .wheel_cof = 1.5,
      // m
      .modules = {{+0.6, +0.6}, {+0.6, -0.6}, {-0.6, +0.6}, {-0.6, -0.6}}};

  trajopt::LinearVelocityMaxMagnitudeConstraint zero_linear_velocity{0.0};
  trajopt::AngularVelocityMaxMagnitudeConstraint zero_angular_velocity{0.0};

  // Example 1: Swerve, one meter forward motion profile
  {
    trajopt::SwervePathBuilder path;
    path.set_drivetrain(swerve_drivetrain);
    path.pose_wpt(0, 0.0, 0.0, 0.0);
    path.pose_wpt(1, 1.0, 0.0, 0.0);
    path.wpt_constraint(0, zero_linear_velocity);
    path.wpt_constraint(1, zero_linear_velocity);
    path.set_control_interval_counts({40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    if (auto solution = generator.generate(true); !solution) {
      std::println("Error in example 1: {}", solution.error());
      return std::to_underlying(solution.error());
    }
  }
}
