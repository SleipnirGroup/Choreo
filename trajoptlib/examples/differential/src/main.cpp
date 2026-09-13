// Copyright (c) TrajoptLib contributors

#include <numbers>
#include <print>
#include <utility>

#include <sleipnir/optimization/solver/exit_status.hpp>
#include <trajopt/differential_trajectory_generator.hpp>

// DifferentialPathBuilder is used to build paths that are optimized into full
// trajectories.
//
// "Wpt" stands for waypoint, an instantaneous moment in the path where certain
// constrains on the robot's state are applied.
//
// "Sgmt" is the abbreviation for segments, the continuum of state between
// waypoints where constraints can also be applied.

int main() {
  trajopt::DifferentialDrivetrain differential_drivetrain{
      // kg
      .mass = 45,
      // kg-m²
      .moi = 6,
      // m
      .wheel_radius = 0.08,
      // rad/s
      .wheel_max_angular_velocity = 70,
      // N-m
      .wheel_max_torque = 5,
      // unitless
      .wheel_cof = 1.5,
      // m
      .trackwidth = 0.6};

  // Example 1: Differential, one meter forward motion profile
  {
    trajopt::DifferentialPathBuilder path;
    path.set_drivetrain(differential_drivetrain);
    path.pose_wpt(0, {0.0, 0.0, 0.0});
    path.pose_wpt(1, {1.0, 0.0, 0.0});
    path.wpt_linear_velocity_max_magnitude(0, 0.0);
    path.wpt_linear_velocity_max_magnitude(1, 0.0);
    path.set_control_interval_counts({40});

    trajopt::DifferentialTrajectoryGenerator generator{path};
    if (auto solution = generator.generate(true); !solution) {
      std::println("Error in example 1: {}", solution.error());
      return std::to_underlying(solution.error());
    }
  }

  // Example 2: Differential, basic curve
  {
    trajopt::DifferentialPathBuilder path;
    path.set_drivetrain(differential_drivetrain);
    path.pose_wpt(0, {1.0, 1.0, -std::numbers::pi / 2});
    path.pose_wpt(1, {2.0, 0.0, 0.0});
    path.wpt_linear_velocity_max_magnitude(0, 0.0);
    path.wpt_linear_velocity_max_magnitude(1, 0.0);
    path.set_control_interval_counts({40});

    trajopt::DifferentialTrajectoryGenerator generator{path};
    if (auto solution = generator.generate(true); !solution) {
      std::println("Error in example 2: {}", solution.error());
      return std::to_underlying(solution.error());
    }
  }

  // Example 3: Differential, three waypoints
  {
    trajopt::DifferentialPathBuilder path;
    path.set_drivetrain(differential_drivetrain);
    path.pose_wpt(0, {0.0, 0.0, std::numbers::pi / 2});
    path.pose_wpt(1, {1.0, 1.0, 0.0});
    path.pose_wpt(2, {2.0, 0.0, std::numbers::pi / 2});
    path.wpt_linear_velocity_max_magnitude(0, 0.0);
    path.wpt_linear_velocity_max_magnitude(1, 0.0);
    path.set_control_interval_counts({50, 50});

    trajopt::DifferentialTrajectoryGenerator generator{path};
    if (auto solution = generator.generate(true); !solution) {
      std::println("Error in example 3: {}", solution.error());
      return std::to_underlying(solution.error());
    }
  }

  // Example 4: Differential, ending velocity
  {
    trajopt::DifferentialPathBuilder path;
    path.set_drivetrain(differential_drivetrain);
    path.pose_wpt(0, {0.0, 0.0, 0.0});
    path.pose_wpt(1, {0.0, 1.0, 0.0});
    path.wpt_linear_velocity_max_magnitude(0, 0.0);
    path.set_control_interval_counts({40});

    trajopt::DifferentialTrajectoryGenerator generator{path};
    if (auto solution = generator.generate(true); !solution) {
      std::println("Error in example 4: {}", solution.error());
      return std::to_underlying(solution.error());
    }
  }

  // Example 5: Differential, keep-out circle
  {
    trajopt::DifferentialPathBuilder path;
    path.set_drivetrain(differential_drivetrain);
    path.set_bumpers(0.65, 0.65, 0.65, 0.65);
    path.pose_wpt(0, {0.0, 0.0, 0.0});
    path.sgmt_keep_out_circle(0, 1, {0.5, 0.5}, 0.1);
    path.pose_wpt(1, {1.0, 0.0, 0.0});
    path.wpt_linear_velocity_max_magnitude(0, 0.0);
    path.wpt_linear_velocity_max_magnitude(1, 0.0);
    path.set_control_interval_counts({40});

    trajopt::DifferentialTrajectoryGenerator generator{path};
    if (auto solution = generator.generate(true); !solution) {
      std::println("Error in example 5: {}", solution.error());
      return std::to_underlying(solution.error());
    }
  }

  // Example 6: Approach a pick up station at a certain direction
  {
    trajopt::DifferentialPathBuilder path;
    path.set_drivetrain(differential_drivetrain);

    // Starting position
    path.pose_wpt(0, {0.0, 0.0, 0.0});

    // Align towards the station one meter behind
    path.pose_wpt(1, {1.0, 1.0, std::numbers::pi / 2});
    path.wpt_angular_velocity_max_magnitude(1, 0.0);
    path.wpt_linear_velocity_direction(1, std::numbers::pi / 2);

    // Go up to the station. In practice, the optimizer will still end up
    // aligning the heading without the pose constraint since it's most optimal.
    path.translation_wpt(2, {1.0, 2.0});

    // Realign behind the station
    path.pose_wpt(3, {1.0, 1.0, std::numbers::pi / 2});
    path.wpt_angular_velocity_max_magnitude(3, 0.0);
    path.wpt_linear_velocity_direction(3, std::numbers::pi / 2);

    // Ending position
    path.pose_wpt(4, {2.0, 0.0, std::numbers::pi});

    path.wpt_linear_velocity_max_magnitude(0, 0.0);
    path.wpt_linear_velocity_max_magnitude(4, 0.0);
    path.set_control_interval_counts({40, 30, 30, 40});

    trajopt::DifferentialTrajectoryGenerator generator{path};
    if (auto solution = generator.generate(true); !solution) {
      std::println("Error in example 6: {}", solution.error());
      // FIXME: Fix solver excessive regularization and line search failure on
      // macOS
      // return std::to_underlying(solution.error());
    }
  }
}
