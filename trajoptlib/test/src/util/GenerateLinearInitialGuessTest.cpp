// Copyright (c) TrajoptLib contributors

#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <trajopt/SwerveTrajectoryGenerator.hpp>
#include <trajopt/util/GenerateLinearInitialGuess.hpp>

TEST_CASE("GenerateLinearInitialGuess - Linear initial guess",
          "[TrajoptUtil]") {
  std::vector<std::vector<trajopt::Pose2d>> initialGuessPoints{
      {{1, 0, 0}}, {{2, 0, 0}, {3, 0, 0}}, {{6, 0, 0}}};
  std::vector<size_t> controlIntervalCounts{2, 3};
  std::vector<double> expectedX{1, 2, 3, 4, 5, 6};
  auto result = trajopt::GenerateLinearInitialGuess<trajopt::SwerveSolution>(
      initialGuessPoints, controlIntervalCounts);
  CHECK(expectedX == result.x);
}
