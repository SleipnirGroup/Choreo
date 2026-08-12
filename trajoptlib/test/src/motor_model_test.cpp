// Copyright (c) TrajoptLib contributors

#include <catch2/catch_test_macros.hpp>
#include <trajopt/util/motor_model.hpp>

TEST_CASE("Motor voltage fraction follows the torque-speed curve",
          "[MotorModel]") {
  using trajopt::motor_voltage_fraction;

  constexpr double stall_torque = 4.0;
  constexpr double free_speed = 100.0;

  CHECK(motor_voltage_fraction(stall_torque, 0.0, stall_torque, free_speed) ==
        1.0);
  CHECK(motor_voltage_fraction(0.0, free_speed, stall_torque, free_speed) ==
        1.0);
  CHECK(motor_voltage_fraction(2.0, 50.0, stall_torque, free_speed) == 1.0);
  CHECK(motor_voltage_fraction(-2.0, -50.0, stall_torque, free_speed) == -1.0);
  CHECK(motor_voltage_fraction(-6.0, 50.0, stall_torque, free_speed) == -1.0);
}
