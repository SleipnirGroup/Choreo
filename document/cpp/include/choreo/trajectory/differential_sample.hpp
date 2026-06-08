// Copyright (c) Choreo contributors

//     DifferentialDrive {
//     t: f64,
//     x: f64,
//     y: f64,
//     heading: f64,
//     vl: f64,
//     vr: f64,
//     omega: f64,
//     al: f64,
//     ar: f64,
//     alpha: f64,
//     fl: f64,
//     fr: f64,
// },

#pragma once

#include <wpi/units/acceleration.hpp>
#include <wpi/units/angle.hpp>
#include <wpi/units/angular_acceleration.hpp>
#include <wpi/units/angular_velocity.hpp>
#include <wpi/units/force.hpp>
#include <wpi/units/length.hpp>
#include <wpi/units/time.hpp>
#include <wpi/units/velocity.hpp>
#include <wpi/util/json.hpp>
#include <trajopt/differential_trajectory_generator.hpp>
#include <wpi/math/trajectory/DifferentialSample.hpp>
#include "wpi/math/kinematics/ChassisAccelerations.hpp"
#include "wpi/math/kinematics/ChassisVelocities.hpp"
namespace choreo {
struct DifferentialSample : wpi::math::DifferentialSample {
  using TrajoptSample = trajopt::DifferentialTrajectorySample;
  DifferentialSample() = default;
  constexpr DifferentialSample(const trajopt::DifferentialTrajectorySample& sample) {
    using namespace wpi::units::literals;
    this->pose = wpi::math::Pose2d{wpi::units::meter_t(sample.x), wpi::units::meter_t(sample.y), wpi::units::radian_t(sample.heading)};
    auto velocity_in_heading = wpi::units::meters_per_second_t((sample.velocity_l + sample.velocity_r) / 2.0);
    wpi::math::ChassisVelocities robot_relative_velocities{velocity_in_heading, 0.0_mps, wpi::units::radians_per_second_t(sample.angular_velocity)};
    auto field_relative_velocities = robot_relative_velocities.ToFieldRelative(pose.Rotation());
    auto  acceleration_in_heading = wpi::units::meters_per_second_squared_t((sample.acceleration_l + sample.acceleration_r) / 2.0);
    wpi::math::ChassisAccelerations robot_relative_accelerations{acceleration_in_heading, wpi::units::meters_per_second_squared_t(0.0), wpi::units::radians_per_second_squared_t(sample.angular_acceleration)};
    auto field_relative_accelerations = robot_relative_accelerations.ToFieldRelative(pose.Rotation());
    this->timestamp = timestamp;
    
    this->velocity = field_relative_velocities;
    this->acceleration = field_relative_accelerations;
    this->leftSpeed = wpi::units::meters_per_second_t(sample.velocity_l);
    this->rightSpeed = wpi::units::meters_per_second_t(sample.velocity_r);
  }
};
}  // namespace choreo
