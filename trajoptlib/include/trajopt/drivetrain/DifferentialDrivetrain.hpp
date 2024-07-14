// Copyright (c) TrajoptLib contributors

#pragma once

#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * A differential drivetrain physical model.
 */
struct TRAJOPT_DLLEXPORT DifferentialDrivetrain {
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

  /// Distance between the two driverails (m).
  double trackwidth;
};

}  // namespace trajopt
