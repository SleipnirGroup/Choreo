// Copyright (c) TrajoptLib contributors

#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>

using Catch::Matchers::WithinAbs;

TEST_CASE("SwervePathBuilder - Linear initial guess", "[SwervePathBuilder]") {
  using namespace trajopt;

  trajopt::SwervePathBuilder path;
  path.wpt_initial_guess_point(0, Pose2d{0.0, 0.0, 0.0});  // at 0

  path.sgmt_initial_guess_points(
      0, {Pose2d{1.0, 0.0, 0.0}, Pose2d{2.0, 0.0, 0.0}});  // from 0 to 1
  path.wpt_initial_guess_point(1, Pose2d{1.0, 0.0, 0.0});  // at 1

  path.wpt_initial_guess_point(2, Pose2d{5.0, 0.0, 0.0});  // at 2

  path.set_control_interval_counts({3, 2});

  std::vector<double> result = path.calculate_linear_initial_guess().x;
  std::vector<double> expected = {0.0, 1.0, 2.0, 1.0, 3.0, 5.0};

  CHECK(result == expected);
}

TEST_CASE("SwervePathBuilder - Spline initial guess", "[SwervePathBuilder]") {
  using namespace trajopt;

  trajopt::SwervePathBuilder path;
  path.wpt_initial_guess_point(0, Pose2d{0.0, 0.0, 0.0});  // at 0

  path.sgmt_initial_guess_points(
      0, {Pose2d{1.0, 0.0, 0.0}, Pose2d{2.0, 0.0, 0.0}});  // from 0 to 1
  path.wpt_initial_guess_point(1, Pose2d{1.0, 0.0, 0.0});  // at 1

  path.sgmt_initial_guess_points(1, {Pose2d{3.0, 0.0, 0.0}});  // from 1 to 2
  path.wpt_initial_guess_point(2, Pose2d{5.0, 0.0, 0.0});      // at 2

  path.set_control_interval_counts({3, 2});

  std::vector<double> result = path.calculate_spline_initial_guess().x;
  std::vector<double> expected = {0.0, 1.0, 2.0, 1.0, 3.0, 5.0};

  REQUIRE(result.size() == expected.size());
  for (size_t i = 0; i < expected.size(); ++i) {
    CHECK_THAT(result[i], WithinAbs(expected[i], 1e-15));
  }
}
