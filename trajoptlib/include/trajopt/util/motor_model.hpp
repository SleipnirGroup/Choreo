// Copyright (c) TrajoptLib contributors

#pragma once

namespace trajopt {

/// Returns the fraction of nominal voltage required to produce a wheel torque
/// at a wheel angular velocity using an ideal DC motor model.
template <typename Torque, typename AngularVelocity>
auto motor_voltage_fraction(const Torque& torque,
                            const AngularVelocity& angular_velocity,
                            double wheel_stall_torque,
                            double wheel_free_angular_velocity) {
  return torque / wheel_stall_torque +
         angular_velocity / wheel_free_angular_velocity;
}

}  // namespace trajopt
