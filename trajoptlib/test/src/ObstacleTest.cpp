// Copyright (c) TrajoptLib contributors

#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <trajopt/SwerveTrajectoryGenerator.hpp>

TEST_CASE("Obstacle - Linear initial guess", "[Obstacle]") {
  SKIP("Fails");

  using namespace trajopt;

  SwerveDrivetrain swerveDrivetrain{
      .mass = 45,
      .moi = 6,
      .wheelRadius = 0.04,
      .wheelMaxAngularVelocity = 70,
      .wheelMaxTorque = 2,
      .modules = {{+0.6, +0.6}, {+0.6, -0.6}, {-0.6, +0.6}, {-0.6, -0.6}}};

  trajopt::SwervePathBuilder path;
  path.PoseWpt(0, 0.0, 0.0, 0.0);
  path.PoseWpt(1, 2.0, 2.0, 0.0);

  constexpr double length = 0.7;
  constexpr double width = 0.7;
  path.AddBumpers(trajopt::Bumpers{.safetyDistance = 0.1,
                                   .points = {{+length / 2, +width / 2},
                                              {-length / 2, +width / 2},
                                              {-length / 2, -width / 2},
                                              {+length / 2, -width / 2}}});

  path.SgmtObstacle(
      0, 1, trajopt::Obstacle{.safetyDistance = 1.0, .points = {{1.0, 1.0}}});

  path.ControlIntervalCounts({10});
  trajopt::SwerveTrajectoryGenerator generator{path};
  CHECK_NOTHROW(generator.Generate());
}
