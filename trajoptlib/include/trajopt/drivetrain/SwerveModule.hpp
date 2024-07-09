// Copyright (c) TrajoptLib contributors

#pragma once

#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * This class represents a single swerve module in a swerve drivetrain.
 *
 * It is defined by the module diagonal, which is the line connecting the origin
 * of the robot coordinate system to the center of the module. The wheel radius,
 * max speed, and max torque must also be specified per module.
 */
struct TRAJOPT_DLLEXPORT SwerveModule {
  /// Translation (meters) of swerve module in robot frame.
  Translation2d translation;

  /// Radius of wheel (meters).
  double wheelRadius;

  /// Maximum angular velocity of wheel (rad/s).
  double wheelMaxAngularVelocity;

  /// Maximum torque (N−m) applied to wheel.
  double wheelMaxTorque;
};

}  // namespace trajopt
