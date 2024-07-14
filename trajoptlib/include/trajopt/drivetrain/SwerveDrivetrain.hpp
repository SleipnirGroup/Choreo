// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * @brief This class represents a swerve drivetrain robot. It includes the
 * physical properties necessary to accurately model the dynamics of the system.
 * An arbitrary number of swerve modules can be specified, but typically it will
 * be four. The order the swerve modules are listed does not matter.
 */
struct TRAJOPT_DLLEXPORT SwerveDrivetrain {
  /// The mass of the robot (kg).
  double mass;

  /// The moment of inertia of the robot about the origin (kg−m²).
  double moi;

  /// Radius of wheel (meters).
  double wheelRadius;

  /// Maximum angular velocity of wheel (rad/s).
  double wheelMaxAngularVelocity;

  /// Maximum torque (N−m) applied to wheel.
  double wheelMaxTorque;

  /// Translation (meters) of each swerve module from the origin of the robot
  /// coordinate system to the center of the module. There's usually one in each
  /// corner.
  std::vector<Translation2d> modules;
};

}  // namespace trajopt
