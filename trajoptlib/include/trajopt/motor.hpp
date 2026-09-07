// Copyright (c) TrajoptLib contributors

#pragma once

namespace trajopt {

/// A DC motor model for a single drive wheel.
///
/// All rotational quantities are referenced to the wheel, not the motor shaft.
/// To convert from motor constants to wheel-referenced constants, divide speeds
/// by the gear ratio and multiply torques, kT, and kV by the gear ratio. kS and
/// the current limits are unaffected by gearing.
///
/// The model assumes a 12 V nominal supply.
struct MotorConfig {
  /// Free speed of the wheel at nominal voltage (rad/s).
  double free_speed;

  /// Stall torque applied to the wheel at nominal voltage (N−m).
  double stall_torque;

  /// Torque constant: wheel torque per amp of stator current (N−m/A).
  double kT;

  /// Velocity constant: back-EMF voltage per unit of wheel angular velocity
  /// (V/(rad/s)).
  double kV;

  /// Static friction voltage: the voltage required to overcome friction and
  /// start the wheel moving (V). This is the kS term from SysID.
  double kS;

  /// Maximum current drawn from the supply per motor (A).
  double supply_limit;

  /// Maximum stator current per motor (A). Also bounds the braking current.
  double stator_limit;

  /// Returns the stall current, computed from the stall torque and torque
  /// constant.
  ///
  /// @return The stall current (A).
  constexpr double stall_current() { return stall_torque / kT; };

  /// Returns the winding resistance, computed from the stall current at a 12 V
  /// nominal supply.
  ///
  /// @return The winding resistance (Ω).
  constexpr double resistance() { return 12 / stall_current(); };
};

}  // namespace trajopt::util
