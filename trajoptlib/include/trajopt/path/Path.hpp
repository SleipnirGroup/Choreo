// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <functional>
#include <vector>

#include "trajopt/constraint/Constraint.hpp"
#include "trajopt/drivetrain/DifferentialDrivetrain.hpp"
#include "trajopt/drivetrain/SwerveDrivetrain.hpp"
#include "trajopt/solution/DifferentialSolution.hpp"
#include "trajopt/solution/SwerveSolution.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * A path waypoint.
 */
struct TRAJOPT_DLLEXPORT Waypoint {
  /// Instantaneous constraints at the waypoint.
  std::vector<Constraint> waypointConstraints;

  /// Continuous constraints along the segment.
  std::vector<Constraint> segmentConstraints;
};

/**
 * Swerve path.
 */
struct TRAJOPT_DLLEXPORT SwervePath {
  /// Waypoints along the path.
  std::vector<Waypoint> waypoints;

  /// Drivetrain of the robot.
  SwerveDrivetrain drivetrain;

  /// A vector of callbacks to be called with the intermediate SwerveSolution
  /// and a user-specified handle at every iteration of the solver.
  std::vector<std::function<void(SwerveSolution&, int64_t)>> callbacks;
};

/**
 * Differential path.
 */
struct TRAJOPT_DLLEXPORT DifferentialPath {
  /// Waypoints along the path.
  std::vector<Waypoint> waypoints;

  /// Drivetrain of the robot.
  DifferentialDrivetrain drivetrain;

  /// A vector of callbacks to be called with the intermediate SwerveSolution
  /// and a user-specified handle at every iteration of the solver.
  std::vector<std::function<void(DifferentialSolution&, int64_t)>> callbacks;
};

}  // namespace trajopt
