// Copyright (c) TrajoptLib contributors

#include <algorithm>
#include <cmath>
#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <trajopt/differential_trajectory_generator.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#include <trajopt/util/motor_model.hpp>

TEST_CASE("Differential trajectories respect the motor voltage limit",
          "[MotorModel]") {
  using namespace trajopt;

  constexpr double wheel_radius = 0.05;
  constexpr double wheel_free_speed = 100.0;
  constexpr double wheel_stall_torque = 4.0;

  DifferentialPathBuilder path;
  path.set_drivetrain({.mass = 20.0,
                       .moi = 2.0,
                       .wheel_radius = wheel_radius,
                       .wheel_max_angular_velocity = 80.0,
                       .wheel_max_torque = 2.0,
                       .wheel_cof = 5.0,
                       .trackwidth = 0.6,
                       .motor_curve_enabled = true,
                       .wheel_free_angular_velocity = wheel_free_speed,
                       .wheel_stall_torque = wheel_stall_torque});
  path.pose_wpt(0, 0.0, 0.0, 0.0);
  path.pose_wpt(1, 10.0, 0.0, 0.0);
  path.wpt_constraint(0, LinearVelocityMaxMagnitudeConstraint{0.0});
  path.wpt_constraint(1, LinearVelocityMaxMagnitudeConstraint{0.0});
  path.sgmt_constraint(0, 1, AngularVelocityMaxMagnitudeConstraint{0.0});
  path.set_control_interval_counts({40});

  auto solution = DifferentialTrajectoryGenerator{path}.generate();
  REQUIRE(solution.has_value());

  double peak_speed = 0.0;
  for (size_t i = 0; i < solution->vl.size(); ++i) {
    peak_speed = std::max(
        {peak_speed, std::abs(solution->vl[i]), std::abs(solution->vr[i])});
    CHECK(std::abs(motor_voltage_fraction(
              solution->Fl[i] * wheel_radius, solution->vl[i] / wheel_radius,
              wheel_stall_torque, wheel_free_speed)) <= 1.001);
    CHECK(std::abs(motor_voltage_fraction(
              solution->Fr[i] * wheel_radius, solution->vr[i] / wheel_radius,
              wheel_stall_torque, wheel_free_speed)) <= 1.001);
  }
  CHECK(peak_speed > 0.5 * wheel_radius * wheel_free_speed);
}

TEST_CASE("Swerve trajectories respect the motor voltage limit",
          "[MotorModel]") {
  using namespace trajopt;

  constexpr double wheel_radius = 0.05;
  constexpr double wheel_free_speed = 100.0;
  constexpr double wheel_stall_torque = 4.0;
  const std::vector<Translation2d> modules{
      {0.3, 0.3}, {0.3, -0.3}, {-0.3, 0.3}, {-0.3, -0.3}};

  SwervePathBuilder path;
  path.set_drivetrain({.mass = 20.0,
                       .moi = 2.0,
                       .wheel_radius = wheel_radius,
                       .wheel_max_angular_velocity = 80.0,
                       .wheel_max_torque = 2.0,
                       .wheel_cof = 5.0,
                       .modules = modules,
                       .motor_curve_enabled = true,
                       .wheel_free_angular_velocity = wheel_free_speed,
                       .wheel_stall_torque = wheel_stall_torque});
  path.pose_wpt(0, 0.0, 0.0, 0.0);
  path.pose_wpt(1, 10.0, 0.0, 0.0);
  path.wpt_constraint(0, LinearVelocityMaxMagnitudeConstraint{0.0});
  path.wpt_constraint(1, LinearVelocityMaxMagnitudeConstraint{0.0});
  path.sgmt_constraint(0, 1, AngularVelocityMaxMagnitudeConstraint{0.0});
  path.set_control_interval_counts({40});

  auto solution = SwerveTrajectoryGenerator{path}.generate();
  REQUIRE(solution.has_value());

  double peak_speed = 0.0;
  for (size_t i = 0; i < solution->vx.size(); ++i) {
    const double cos_heading = solution->thetacos[i];
    const double sin_heading = solution->thetasin[i];
    Translation2d chassis_velocity{
        solution->vx[i] * cos_heading + solution->vy[i] * sin_heading,
        -solution->vx[i] * sin_heading + solution->vy[i] * cos_heading};
    peak_speed = std::max(peak_speed, chassis_velocity.norm());

    for (size_t module_index = 0; module_index < modules.size();
         ++module_index) {
      Translation2d module_velocity{
          chassis_velocity.x() - modules[module_index].y() * solution->omega[i],
          chassis_velocity.y() +
              modules[module_index].x() * solution->omega[i]};
      Translation2d module_force{
          solution->module_fx[i][module_index] * cos_heading +
              solution->module_fy[i][module_index] * sin_heading,
          -solution->module_fx[i][module_index] * sin_heading +
              solution->module_fy[i][module_index] * cos_heading};
      Translation2d voltage_fraction{
          motor_voltage_fraction(module_force.x() * wheel_radius,
                                 module_velocity.x() / wheel_radius,
                                 wheel_stall_torque, wheel_free_speed),
          motor_voltage_fraction(module_force.y() * wheel_radius,
                                 module_velocity.y() / wheel_radius,
                                 wheel_stall_torque, wheel_free_speed)};
      CHECK(voltage_fraction.norm() <= 1.001);
    }
  }
  CHECK(peak_speed > 0.5 * wheel_radius * wheel_free_speed);
}
