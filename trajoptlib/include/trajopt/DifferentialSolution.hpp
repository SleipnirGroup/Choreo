// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include "util/SymbolExports.hpp"

namespace trajopt {
/**
 * The holonomic trajectory optimization solution.
 */
struct TRAJOPT_DLLEXPORT DifferentialSolution {
  /// Times between samples.
  std::vector<double> dt;

  /// X positions.
  std::vector<double> x;

  /// Y positions.
  std::vector<double> y;

  /// Heading.
  std::vector<double> heading;

  /// The left velocities.
  std::vector<double> vL;

  /// The right velocities.
  std::vector<double> vR;

  /// The force of the left driverail wheels.
  std::vector<double> FL;

  /// The force of the right driverail wheels.
  std::vector<double> FR;
};
}  // namespace trajopt
