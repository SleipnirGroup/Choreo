// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * A swerve drivetrain physical model.
 */
struct TRAJOPT_DLLEXPORT SwerveDrivetrain {
  /// The mass of the robot (kg).
  double mass;

  /// The moment of inertia of the robot about the origin (kg−m²).
  double moi;

  /// Radius of wheel (m).
  double wheelRadius;

  /// Maximum angular velocity of wheel (rad/s).
  double wheelMaxAngularVelocity;

  /// Maximum torque applied to wheel (N−m).
  double wheelMaxTorque;

  /// Translation of each swerve module from the origin of the robot coordinate
  /// system to the center of the module (m). There's usually one in each
  /// corner.
  std::vector<Translation2d> modules;
};

}  // namespace trajopt
