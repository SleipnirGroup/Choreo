// Copyright (c) TrajoptLib contributors

#include <numbers>

#include <trajopt/SwerveTrajectoryGenerator.hpp>

// SwervePathBuilder is used to build paths that are optimized into full
// trajectories.
//
// "Wpt" stands for waypoint, an instantaneous moment in the path where certain
// constrains on the robot's state are applied.
//
// "Sgmt" is the abbreviation for segments, the continuum of state between
// waypoints where constraints can also be applied.

int main() {
  trajopt::SwerveDrivetrain swerveDrivetrain{
      .mass = 45,
      .moi = 6,
      .wheelRadius = 0.04,
      .wheelMaxAngularVelocity = 70,
      .wheelMaxTorque = 2,
      .wheelCoF = 1.5,
      .modules = {{+0.6, +0.6}, {+0.6, -0.6}, {-0.6, +0.6}, {-0.6, -0.6}}};

  trajopt::LinearVelocityMaxMagnitudeConstraint zeroLinearVelocity{0.0};
  trajopt::AngularVelocityMaxMagnitudeConstraint zeroAngularVelocity{0.0};

  // Example 1: Swerve, one meter forward motion profile
  {
    trajopt::SwervePathBuilder path;
    path.SetDrivetrain(swerveDrivetrain);
    path.PoseWpt(0, 0.0, 0.0, 0.0);
    path.PoseWpt(1, 1.0, 0.0, 0.0);
    path.WptConstraint(0, zeroLinearVelocity);
    path.WptConstraint(1, zeroLinearVelocity);
    path.SetControlIntervalCounts({40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.Generate(true);
  }

  // Example 2: Swerve, basic curve
  {
    trajopt::SwervePathBuilder path;
    path.SetDrivetrain(swerveDrivetrain);
    path.PoseWpt(0, 1.0, 1.0, -std::numbers::pi / 2);
    path.PoseWpt(1, 2.0, 0.0, 0.0);
    path.WptConstraint(0, zeroLinearVelocity);
    path.WptConstraint(1, zeroLinearVelocity);
    path.SetControlIntervalCounts({40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.Generate(true);
  }

  // Example 3: Swerve, three waypoints
  {
    trajopt::SwervePathBuilder path;
    path.SetDrivetrain(swerveDrivetrain);
    path.PoseWpt(0, 0.0, 0.0, std::numbers::pi / 2);
    path.PoseWpt(1, 1.0, 1.0, 0.0);
    path.PoseWpt(2, 2.0, 0.0, std::numbers::pi / 2);
    path.WptConstraint(0, zeroLinearVelocity);
    path.WptConstraint(1, zeroLinearVelocity);
    path.SetControlIntervalCounts({40, 40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.Generate(true);
  }

  // Example 4: Swerve, ending velocity
  {
    trajopt::SwervePathBuilder path;
    path.SetDrivetrain(swerveDrivetrain);
    path.PoseWpt(0, 0.0, 0.0, 0.0);
    path.PoseWpt(1, 0.0, 1.0, 0.0);
    path.WptConstraint(0, zeroLinearVelocity);
    path.SetControlIntervalCounts({40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.Generate(true);
  }

  // Example 5: Swerve, circle obstacle
  {
    trajopt::SwervePathBuilder path;
    path.SetDrivetrain(swerveDrivetrain);
    path.PoseWpt(0, 0.0, 0.0, 0.0);
    trajopt::Obstacle obstacle{// Radius of 0.1
                               .safetyDistance = 0.1,
                               .points = {{0.5, 0.5}}};
    for (size_t i = 0; i < path.GetBumpers().at(0).points.size(); i++) {
      path.SgmtConstraint(0, 1,
                          trajopt::PointPointMinConstraint{
                              path.GetBumpers().at(0).points.at(i),
                              obstacle.points.at(0), obstacle.safetyDistance});
      path.SgmtConstraint(
          0, 1,
          trajopt::LinePointConstraint{
              path.GetBumpers().at(0).points.at(i),
              path.GetBumpers().at(0).points.at(
                  (i + 1) % path.GetBumpers().at(0).points.size()),
              obstacle.points.at(0), obstacle.safetyDistance});
    }

    path.PoseWpt(1, 1.0, 0.0, 0.0);
    path.WptConstraint(0, zeroLinearVelocity);
    path.WptConstraint(1, zeroLinearVelocity);
    path.SetControlIntervalCounts({40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.Generate(true);
  }

  // Example 6: Approach a pick up station at a certain direction
  {
    trajopt::SwervePathBuilder path;
    path.SetDrivetrain(swerveDrivetrain);

    // Starting position
    path.PoseWpt(0, 0.0, 0.0, 0.0);

    // Align towards the station one meter behind
    path.PoseWpt(1, 1.0, 1.0, std::numbers::pi / 2);
    path.WptConstraint(1, zeroAngularVelocity);
    path.WptConstraint(
        1, trajopt::LinearVelocityDirectionConstraint{std::numbers::pi / 2});

    // Go up to the station. In practice, the optimizer will still end up
    // aligning the heading without the pose constraint since it's most optimal.
    path.TranslationWpt(2, 1.0, 2.0);

    // Realign behind the station
    path.PoseWpt(3, 1.0, 1.0, std::numbers::pi / 2);
    path.WptConstraint(3, zeroAngularVelocity);
    path.WptConstraint(
        3, trajopt::LinearVelocityDirectionConstraint{std::numbers::pi / 2});

    // Ending position
    path.PoseWpt(4, 2.0, 0.0, std::numbers::pi);

    path.WptConstraint(0, zeroLinearVelocity);
    path.WptConstraint(4, zeroLinearVelocity);
    path.SetControlIntervalCounts({40, 30, 30, 40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.Generate(true);
  }

  // Example 7: Circular path with a point-point constraint
  {
    // Note that forcing a circular path is not a common problem in FRC. This
    // example is only here to demonstrate how various constraints work.
    trajopt::SwervePathBuilder path;
    path.SetDrivetrain(swerveDrivetrain);

    path.PoseWpt(0, 0.0, 0.0, 0.0);
    path.SgmtConstraint(0, 1,
                        trajopt::PointPointMinConstraint{
                            // Robot point -- center of robot
                            {0.0, 0.0},
                            // Field point around which to orbit
                            {1.0, 0.0},
                            // Stay 1 m away to force circular motion
                            1.0});

    // Tell optimizer to go in +y direction rather than -y
    path.WptInitialGuessPoint(0, {0.0, 0.0, 0.0});

    path.PoseWpt(1, 2.0, 0.0, 0.0);

    path.WptConstraint(0, zeroLinearVelocity);
    path.WptConstraint(1, zeroLinearVelocity);
    path.SetControlIntervalCounts({30});

    trajopt::SwerveTrajectoryGenerator generator{path};
    [[maybe_unused]]
    auto solution = generator.Generate(true);
  }
}
