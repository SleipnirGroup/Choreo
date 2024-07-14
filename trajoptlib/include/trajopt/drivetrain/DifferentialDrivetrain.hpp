// Copyright (c) TrajoptLib contributors

#pragma once

#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * A differential drivetrain physical model
 */
struct TRAJOPT_DLLEXPORT DifferentialDrivetrain {
  /// mass of the robot
  double mass;
  /// moment of inertia of the robot about the central axis
  double moi;
  /// distance between the two driverails
  double trackwidth;

  /// radius of the wheels or treads
  double wheelRadius;
  /// maximum angular velocity
  double wheelMaxAngularVelocity;
  /// maximum torque applied to wheel
  double wheelMaxTorque;
};

}  // namespace trajopt
