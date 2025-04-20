// Copyright (c) TrajoptLib contributors

#include <numbers>

#include <trajopt/swerve_trajectory_generator.hpp>

// SwervePathBuilder is used to build paths that are optimized into full
// trajectories.
//
// "Wpt" stands for waypoint, an instantaneous moment in the path where certain
// constrains on the robot's state are applied.
//
// "Sgmt" is the abbreviation for segments, the continuum of state between
// waypoints where constraints can also be applied.

int main() {
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
    [[maybe_unused]]
    auto solution = generator.generate(true);
  }

  // Example 2: Swerve, basic curve
  {
    trajopt::SwervePathBuilder path;
    path.set_drivetrain(swerve_drivetrain);
    path.pose_wpt(0, 1.0, 1.0, -std::numbers::pi / 2);
    path.pose_wpt(1, 2.0, 0.0, 0.0);
    path.wpt_constraint(0, zero_linear_velocity);
    path.wpt_constraint(1, zero_linear_velocity);
    path.set_control_interval_counts({40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.generate(true);
  }

  // Example 3: Swerve, three waypoints
  {
    trajopt::SwervePathBuilder path;
    path.set_drivetrain(swerve_drivetrain);
    path.pose_wpt(0, 0.0, 0.0, std::numbers::pi / 2);
    path.pose_wpt(1, 1.0, 1.0, 0.0);
    path.pose_wpt(2, 2.0, 0.0, std::numbers::pi / 2);
    path.wpt_constraint(0, zero_linear_velocity);
    path.wpt_constraint(1, zero_linear_velocity);
    path.set_control_interval_counts({40, 40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.generate(true);
  }

  // Example 4: Swerve, ending velocity
  {
    trajopt::SwervePathBuilder path;
    path.set_drivetrain(swerve_drivetrain);
    path.pose_wpt(0, 0.0, 0.0, 0.0);
    path.pose_wpt(1, 0.0, 1.0, 0.0);
    path.wpt_constraint(0, zero_linear_velocity);
    path.set_control_interval_counts({40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.generate(true);
  }

  // Example 5: Swerve, keep-out circle
  {
    trajopt::SwervePathBuilder path;
    path.set_drivetrain(swerve_drivetrain);
    path.pose_wpt(0, 0.0, 0.0, 0.0);
    trajopt::KeepOutRegion keep_out{// Radius of 0.1
                                    .safety_distance = 0.1,
                                    .points = {{0.5, 0.5}}};
    for (size_t i = 0; i < path.get_bumpers().at(0).points.size(); i++) {
      path.sgmt_constraint(
          0, 1,
          trajopt::PointPointMinConstraint{
              path.get_bumpers().at(0).points.at(i), keep_out.points.at(0),
              keep_out.safety_distance});
      path.sgmt_constraint(
          0, 1,
          trajopt::LinePointConstraint{
              path.get_bumpers().at(0).points.at(i),
              path.get_bumpers().at(0).points.at(
                  (i + 1) % path.get_bumpers().at(0).points.size()),
              keep_out.points.at(0), keep_out.safety_distance});
    }

    path.pose_wpt(1, 1.0, 0.0, 0.0);
    path.wpt_constraint(0, zero_linear_velocity);
    path.wpt_constraint(1, zero_linear_velocity);
    path.set_control_interval_counts({40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.generate(true);
  }

  // Example 6: Approach a pick up station at a certain direction
  {
    trajopt::SwervePathBuilder path;
    path.set_drivetrain(swerve_drivetrain);

    // Starting position
    path.pose_wpt(0, 0.0, 0.0, 0.0);

    // Align towards the station one meter behind
    path.pose_wpt(1, 1.0, 1.0, std::numbers::pi / 2);
    path.wpt_constraint(1, zero_angular_velocity);
    path.wpt_constraint(
        1, trajopt::LinearVelocityDirectionConstraint{std::numbers::pi / 2});

    // Go up to the station. In practice, the optimizer will still end up
    // aligning the heading without the pose constraint since it's most optimal.
    path.translation_wpt(2, 1.0, 2.0);

    // Realign behind the station
    path.pose_wpt(3, 1.0, 1.0, std::numbers::pi / 2);
    path.wpt_constraint(3, zero_angular_velocity);
    path.wpt_constraint(
        3, trajopt::LinearVelocityDirectionConstraint{std::numbers::pi / 2});

    // Ending position
    path.pose_wpt(4, 2.0, 0.0, std::numbers::pi);

    path.wpt_constraint(0, zero_linear_velocity);
    path.wpt_constraint(4, zero_linear_velocity);
    path.set_control_interval_counts({40, 30, 30, 40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.generate(true);
  }

  // Example 7: Circular path with a point-point constraint
  {
    // Note that forcing a circular path is not a common problem in FRC. This
    // example is only here to demonstrate how various constraints work.
    trajopt::SwervePathBuilder path;
    path.set_drivetrain(swerve_drivetrain);

    path.pose_wpt(0, 0.0, 0.0, 0.0);
    path.sgmt_constraint(0, 1,
                         trajopt::PointPointMinConstraint{
                             // Robot point -- center of robot
                             {0.0, 0.0},
                             // Field point around which to orbit
                             {1.0, 0.0},
                             // Stay 1 m away to force circular motion
                             1.0});

    // Tell optimizer to go in +y direction rather than -y
    path.wpt_initial_guess_point(0, {0.0, 0.0, 0.0});

    path.pose_wpt(1, 2.0, 0.0, 0.0);

    path.wpt_constraint(0, zero_linear_velocity);
    path.wpt_constraint(1, zero_linear_velocity);
    path.set_control_interval_counts({30});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.generate(true);
  }
}
