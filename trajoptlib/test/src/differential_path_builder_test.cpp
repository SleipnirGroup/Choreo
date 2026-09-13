// Copyright (c) TrajoptLib contributors

#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <trajopt/differential_trajectory_generator.hpp>
#include <trajopt/geometry/pose2.hpp>

TEST_CASE("DifferentialPathBuilder - Linear initial guess",
          "[DifferentialPathBuilder]") {
  using namespace trajopt;

  trajopt::DifferentialPathBuilder path;
  path.empty_wpt(0, Pose2d{0.0, 0.0, 0.0});  // at 0

  path.sgmt_initial_guess_points(
      0,
      // from 0 to 1
      std::vector{Pose2d{1.0, 0.0, 0.0}, Pose2d{2.0, 0.0, 0.0}});
  path.empty_wpt(1, Pose2d{1.0, 0.0, 0.0});  // at 1

  path.empty_wpt(2, Pose2d{5.0, 0.0, 0.0});  // at 2

  path.set_control_interval_counts({3, 2});

  std::vector<double> result = path.calculate_linear_initial_guess().x;
  std::vector<double> expected = {0.0, 1.0, 2.0, 1.0, 3.0, 5.0};

  CHECK(result == expected);
}
