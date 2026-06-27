// Copyright (c) Choreo contributors

#pragma once
#include <algorithm>
#include <memory>
#include <utility>
#include <vector>
#include <array>
#include <wpi/units/force.hpp>
#include <wpi/util/json.hpp>
#include <wpi/math/trajectory/TrajectorySample.hpp>
#include "trajopt/swerve_trajectory_generator.hpp"
#include "sample_concept.hpp"
#include "wpi/math/trajectory/HolonomicTrajectory.hpp"
#include "wpi/math/trajectory/Trajectory.hpp"
#include "../drive_type.hpp"
namespace choreo {
struct SwerveDriveType {
  using WPILibSample = wpi::math::TrajectorySample;
  static_assert(SampleLike<WPILibSample>, "SwerveDriveType::WPILibSample must match SampleLike");
  using WPILibTrajectory = wpi::math::HolonomicTrajectory;
  using TrajoptSample = trajopt::SwerveTrajectorySample;
  constexpr static inline DriveType driveType = DriveType::Swerve;
  constexpr static inline const char* tag = "Swerve";
  constexpr static WPILibSample fromTrajopt(const TrajoptSample& sample) {
    return WPILibSample{
    wpi::units::second_t(sample.timestamp),
    {wpi::units::meter_t(sample.x), wpi::units::meter_t(sample.y), wpi::units::radian_t(sample.heading)},
    {wpi::units::meters_per_second_t(sample.velocity_x), wpi::units::meters_per_second_t(sample.velocity_y), wpi::units::radians_per_second_t(sample.angular_velocity)},
    {wpi::units::meters_per_second_squared_t(sample.acceleration_x), wpi::units::meters_per_second_squared_t(sample.acceleration_y), wpi::units::radians_per_second_squared_t(sample.angular_acceleration)}
    };
  }
  
};
static_assert(DriveTypeLike<SwerveDriveType>, "SwerveDriveType must satisfy DriveTypeLike");
}  // namespace choreo
