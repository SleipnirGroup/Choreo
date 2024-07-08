// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * @brief Represents a physical obstacle that the robot must avoid by a certain
 * distance. Arbitrary polygons can be expressed with this class, and circle
 * obstacles can also be created by only using one point with a safety distance.
 * Obstacle points must be wound either clockwise or counterclockwise.
 */
struct TRAJOPT_DLLEXPORT Obstacle {
  /// Minimum distance from the obstacle the robot must maintain.
  double safetyDistance;

  /// The list of points that make up this obstacle.
  std::vector<Translation2d> points;
};

}  // namespace trajopt
