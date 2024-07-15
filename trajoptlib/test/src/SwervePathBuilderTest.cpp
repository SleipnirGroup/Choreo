// Copyright (c) TrajoptLib contributors

#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <trajopt/SwerveTrajectoryGenerator.hpp>

TEST_CASE("SwervePathBuilder - Linear initial guess", "[SwervePathBuilder]") {
  using namespace trajopt;

  trajopt::SwervePathBuilder path;
  path.WptInitialGuessPoint(0, Pose2d{0.0, 0.0, 0.0});  // at 0

  path.SgmtInitialGuessPoints(
      0, {Pose2d{1.0, 0.0, 0.0}, Pose2d{2.0, 0.0, 0.0}});  // from 0 to 1
  path.WptInitialGuessPoint(1, Pose2d{1.0, 0.0, 0.0});     // at 1

  path.WptInitialGuessPoint(2, Pose2d{5.0, 0.0, 0.0});  // at 2

  path.ControlIntervalCounts({3, 2});

  std::vector<double> result = path.CalculateInitialGuess().x;
  std::vector<double> expected = {0.0, 1.0, 2.0, 1.0, 3.0, 5.0};

  CHECK(result == expected);
}
