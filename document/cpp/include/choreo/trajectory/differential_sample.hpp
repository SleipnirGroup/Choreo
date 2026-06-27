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
#include "sample_concept.hpp"
#include "wpi/math/kinematics/ChassisAccelerations.hpp"
#include "wpi/math/kinematics/ChassisVelocities.hpp"
#include "../drive_type.hpp"
#include "wpi/math/trajectory/DifferentialTrajectory.hpp"
namespace choreo {
struct DifferentialDriveType{
  using WPILibSample = wpi::math::DifferentialSample;
  using WPILibTrajectory = wpi::math::DifferentialTrajectory;
  using TrajoptSample = trajopt::DifferentialTrajectorySample;
  constexpr static inline DriveType driveType = DriveType::Differential;
  constexpr static inline const char* tag = "Differential";
  constexpr static WPILibSample fromTrajopt(const TrajoptSample& sample) {
    using namespace wpi::units::literals;
    auto pose = wpi::math::Pose2d{wpi::units::meter_t(sample.x), wpi::units::meter_t(sample.y), wpi::units::radian_t(sample.heading)};
    auto velocity_in_heading = wpi::units::meters_per_second_t((sample.velocity_l + sample.velocity_r) / 2.0);
    wpi::math::ChassisVelocities robot_relative_velocities{velocity_in_heading, 0.0_mps, wpi::units::radians_per_second_t(sample.angular_velocity)};
    auto field_relative_velocities = robot_relative_velocities.ToFieldRelative(pose.Rotation());
    auto  acceleration_in_heading = wpi::units::meters_per_second_squared_t((sample.acceleration_l + sample.acceleration_r) / 2.0);
    wpi::math::ChassisAccelerations robot_relative_accelerations{acceleration_in_heading, wpi::units::meters_per_second_squared_t(0.0), wpi::units::radians_per_second_squared_t(sample.angular_acceleration)};
    auto field_relative_accelerations = robot_relative_accelerations.ToFieldRelative(pose.Rotation());
    auto timestamp = wpi::units::second_t(sample.timestamp);
    
    auto leftSpeed = wpi::units::meters_per_second_t(sample.velocity_l);
    auto rightSpeed = wpi::units::meters_per_second_t(sample.velocity_r);
    return WPILibSample{
      timestamp,
      pose,
      field_relative_velocities,
      field_relative_accelerations,
      leftSpeed,
      rightSpeed
    };
  }
};
static_assert(DriveTypeLike<DifferentialDriveType>, "DifferentialDriveType must satisfy DriveTypeLike");
}  // namespace choreo
