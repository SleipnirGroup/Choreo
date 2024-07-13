// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <functional>

#include "trajopt/drivetrain/DifferentialDrivetrain.hpp"
#include "trajopt/path/Path.hpp"
#include "trajopt/path/PathBuilder.hpp"
#include "trajopt/solution/DifferentialSolution.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * Builds a swerve path using information about how the robot
 * must travel through a series of waypoints. This path can be converted
 * to a trajectory using DifferentialTrajectoryGenerator.
 */
class TRAJOPT_DLLEXPORT DifferentialPathBuilder
    : public PathBuilder<DifferentialPath> {
 public:
  /**
   * Set the Drivetrain object
   *
   * @param drivetrain the new drivetrain
   */
  void SetDrivetrain(DifferentialDrivetrain drivetrain);

  /**
   * Calculate a discrete, linear initial guess of the x, y, and heading
   * of the robot that goes through each segment.
   *
   * @return the initial guess, as a solution
   */
  DifferentialSolution CalculateInitialGuess() const;

  /**
   * Add a callback to retrieve the state of the solver as a
   * DifferentialSolution.
   * This callback will run on every iteration of the solver.
   * The callback's first parameter is the SwerveSolution based on the solver's
   * state at that iteration. The second parameter is the handle passed into
   * Generate().
   * @param callback the callback
   */
  void AddIntermediateCallback(
      const std::function<void(DifferentialSolution&, int64_t)> callback);
};

}  // namespace trajopt
