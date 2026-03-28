// Copyright (c) TrajoptLib contributors

#pragma once

namespace trajopt::util {
struct MotorConfig {
  const double free_speed;
  const double stall_torque;
  const double kT;
  const double kV;
  const double free_current;
  const double supply_limit;
  const double stator_limit;

  constexpr double stall_current() { return stall_torque / kT; };
  constexpr double resistance() { return 12 / stall_current(); };
};
}  // namespace trajopt::util
