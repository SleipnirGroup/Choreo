// Copyright (c) TrajoptLib contributors

#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#include <trajopt/util/generate_linear_initial_guess.hpp>

TEST_CASE("generate_linear_initial_guess - Linear initial guess",
          "[TrajoptUtil]") {
  std::vector<std::vector<trajopt::Pose2d>> initial_guess_points{
      {{1, 0, 0}}, {{2, 0, 0}, {3, 0, 0}}, {{6, 0, 0}}};
  std::vector<size_t> control_interval_counts{2, 3};
  std::vector<double> expected_x{1, 2, 3, 4, 5, 6};
  auto result = trajopt::generate_linear_initial_guess<trajopt::SwerveSolution>(
      initial_guess_points, control_interval_counts);
  CHECK(expected_x == result.x);
}
