#pragma once

#include <vector>
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Represents a physical keep-out region that the robot must avoid by a certain
/// distance. Arbitrary polygons can be expressed with this class, and keep-out
/// circles can also be created by only using one point with a safety distance.
///
/// Keep-out points must be wound either clockwise or counterclockwise.
struct TRAJOPT_DLLEXPORT KeepOutRegion {
  /// Minimum distance from the keep-out region the robot must maintain.
  double safety_distance;

  /// The list of points that make up this keep-out region.
  std::vector<Translation2d> points;
};
}// namespace trajopt