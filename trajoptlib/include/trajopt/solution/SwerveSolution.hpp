// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * The swerve drive trajectory optimization solution.
 */
struct TRAJOPT_DLLEXPORT SwerveSolution {
  /// Times between samples.
  std::vector<double> dt;

  /// X positions.
  std::vector<double> x;

  /// Y positions.
  std::vector<double> y;

  /// Heading cosine.
  std::vector<double> thetacos;

  /// Heading sine.
  std::vector<double> thetasin;

  /// The x velocities.
  std::vector<double> vx;

  /// The y velocities.
  std::vector<double> vy;

  /// The angular velocities.
  std::vector<double> omega;

  /// The x accelerations.
  std::vector<double> ax;

  /// The y accelerations.
  std::vector<double> ay;

  /// The angular accelerations.
  std::vector<double> alpha;

  /// The x forces for each module.
  std::vector<std::vector<double>> moduleFX;

  /// The y forces for each module.
  std::vector<std::vector<double>> moduleFY;
};

}  // namespace trajopt
