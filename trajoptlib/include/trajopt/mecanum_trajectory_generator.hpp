// Copyright (c) TrajoptLib contributors
// Developed by Polar (23396) & Thomas (22377) for FTC Choreo under
// github/@Null-Robotics.

#pragma once

#include <expected>
#include <utility>
#include <vector>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>

#include "trajopt/geometry/translation2.hpp"
#include "trajopt/path/path_builder.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/**
 * A mecanum drivetrain physical model.
 */
struct TRAJOPT_DLLEXPORT MecanumDrivetrain {
  /**
   * The mass of the robot in [kg]
   */
  double mass;

  /**
   * The MOI of the robot about the origin [kg-m²]
   */
  double moi;

  /**
   * Radius of the wheel [m]
   */
  double wheel_radius;

  /**
   * Maximum angular velocity of the wheel [rad/s].
   */
  double wheel_max_angular_velocity;

  /**
   * Maximum torque applied to the wheel [N-m]
   */
  double wheel_max_torque;

  /**
   * The Coefficient of Friction (CoF) of the wheels.
   */
  double wheel_cof;

  /**
   * Width of the drivebase in [m]
   */
  double width;

  /**
   * Length of the drivebase in [m]
   */
  double length;
};

/**
 * A model of a tire
 */
class TireModel {
 public:
  /**
   * @param slipRatio The slip ratio of the wheel
   * @param normal The normal expression of the wheel
   *
   * @return The longitudial force in Newtons applied on the wheel
   */
  double longitudial(double slipRatio, double normal);

  /**
   * @param slipAngle The slip angle of the wheel in radians.
   * @param normal The normal expression of the wheel.
   *
   * @return The lateral force applied to the wheel in Newtons.
   */
  double lateral(double slipAngle, double normal);

  /**
   * @param slipAngle The slip angle of the wheel in radians.
   * @param normal The normal expression of the wheel.
   *
   * @return The output of the expression that finds aligning movement to the
   * plane the wheel sits on.
   */
  double aligningMovement(double slipAngle, double expression);
};

/**
 * The mecanum drive trajectory optimization solution.
 */
struct TRAJOPT_DLLEXPORT MecanumSolution{};

/**
 * Mecanum drive trajectory sample.
 */
class TRAJOPT_DLLEXPORT MecanumTrajectorySample{};

/**
 * Mecanum trajectory.
 */
class TRAJOPT_DLLEXPORT MecanumTrajectory{};

/**
 * A mecanum path.
 */
using MecanumPath = Path<MecanumDrivetrain, MecanumSolution>;

/**
 * Builds a mecanum path using information about how the robot
 * must travel through a series of waypoints. This path can be converted to
 * a trajectory using MecanumTrajectoryGenerator.
 */
using MecanumPathBuilder = PathBuilder<MecanumDrivetrain, MecanumSolution>;

/**
 * This trajectory generator class contains functions to generate
 * time-optimal trajectories for mecanum drivetrains.
 */
class TRAJOPT_DLLEXPORT MecanumTrajectoryGenerator {}

}  // namespace trajopt