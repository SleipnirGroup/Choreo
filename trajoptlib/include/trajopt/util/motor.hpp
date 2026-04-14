// Copyright (c) TrajoptLib contributors

#pragma once

namespace trajopt::util {
struct MotorConfig {
  double free_speed;
  double stall_torque;
  double kT;
  double kV;
  double supply_limit;
  double stator_limit;

  constexpr double stall_current() { return stall_torque / kT; };
  constexpr double resistance() { return 12 / stall_current(); };
};
}  // namespace trajopt::util
