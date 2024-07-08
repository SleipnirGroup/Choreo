// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include "trajopt/drivetrain/SwerveModule.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * @brief This class represents a swerve drivetrain robot. It includes the
 * physical properties necessary to accurately model the dynamics of the system.
 * An arbitrary number of swerve modules can be specified, but typically it will
 * be four. The order the swerve modules are listed does not matter.
 */
struct TRAJOPT_DLLEXPORT SwerveDrivetrain {
  /// the mass of the robot (kg)
  double mass;
  /// the moment of inertia of the robot about the origin (kg−m²)
  double moi;
  /// The list of swerve modules that make the robot move, usually one in each
  /// corner.
  std::vector<SwerveModule> modules;
};

}  // namespace trajopt
