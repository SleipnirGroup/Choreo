// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <cassert>
#include <cstddef>
#include <functional>
#include <vector>

#include "trajopt/drivetrain/SwerveDrivetrain.hpp"
#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/path/Path.hpp"
#include "trajopt/path/PathBuilder.hpp"
#include "trajopt/solution/SwerveSolution.hpp"

namespace trajopt {

/**
 * Builds a swerve path using information about how the robot
 * must travel through a series of waypoints. This path can be converted
 * to a trajectory using SwerveTrajectoryGenerator.
 */
class TRAJOPT_DLLEXPORT SwervePathBuilder : public PathBuilder<SwervePath> {
 public:
  /**
   * Set the Drivetrain object
   *
   * @param drivetrain the new drivetrain
   */
  void SetDrivetrain(SwerveDrivetrain drivetrain);

  /**
   * Calculate a discrete, linear initial guess of the x, y, and heading
   * of the robot that goes through each segment.
   *
   * @return the initial guess, as a solution
   */
  SwerveSolution CalculateInitialGuess() const;

  /**
   * Add a callback to retrieve the state of the solver as a SwerveSolution.
   * This callback will run on every iteration of the solver.
   * The callback's first parameter is the SwerveSolution based on the solver's
   * state at that iteration. The second parameter is the handle passed into
   * Generate().
   * @param callback the callback
   */
  void AddIntermediateCallback(
      const std::function<void(SwerveSolution&, int64_t)> callback);
};

}  // namespace trajopt
