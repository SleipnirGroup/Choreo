// Copyright (c) TrajoptLib contributors

#pragma once

#include <utility>
#include <vector>

#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * Differential trajectory sample.
 */
class TRAJOPT_DLLEXPORT DifferentialTrajectorySample {
 public:
  /// The timestamp.
  double timestamp = 0.0;

  /// The x coordinate.
  double x = 0.0;

  /// The y coordinate.
  double y = 0.0;

  /// The heading.
  double heading = 0.0;

  /// The left wheels velocity.
  double velocityL = 0.0;

  /// The right wheels velocity.
  double velocityR = 0.0;

  DifferentialTrajectorySample() = default;

  /**
   * Construct a DifferentialTrajectorySample.
   *
   * @param timestamp The timestamp.
   * @param x The x coordinate. @param y The y coordinate.
   * @param heading The heading.
   * @param velocityL The left wheels velocity.
   * @param velocityR The right wheels velocity.
   */
  DifferentialTrajectorySample(double timestamp, double x, double y,
                               double heading, double velocityL,
                               double velocityR)
      : timestamp{timestamp},
        x{x},
        y{y},
        heading{heading},
        velocityL{velocityL},
        velocityR{velocityR} {}
};

}  // namespace trajopt
