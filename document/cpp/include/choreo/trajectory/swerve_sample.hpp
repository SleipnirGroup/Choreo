// Copyright (c) Choreo contributors

#pragma once
#include <algorithm>
#include <memory>
#include <utility>
#include <vector>

#include <wpi/util/json.hpp>
#include <wpi/math/trajectory/TrajectorySample.hpp>
#ifdef WITH_TRAJOPT
#include <trajopt/swerve_trajectory_generator.hpp>
#endif
namespace choreo {
struct SwerveSample : wpi::math::TrajectorySample {
  using TrajoptSample = trajopt::SwerveTrajectorySample;
  SwerveSample() = default;
  constexpr SwerveSample(const trajopt::SwerveTrajectorySample& sample) : wpi::math::TrajectorySample(
    wpi::units::second_t(sample.timestamp),
    {wpi::units::meter_t(sample.x), wpi::units::meter_t(sample.y), wpi::units::radian_t(sample.heading)},
    {wpi::units::meters_per_second_t(sample.velocity_x), wpi::units::meters_per_second_t(sample.velocity_y), wpi::units::radians_per_second_t(sample.angular_velocity)},
    {wpi::units::meters_per_second_squared_t(sample.acceleration_x), wpi::units::meters_per_second_squared_t(sample.acceleration_y), wpi::units::radians_per_second_squared_t(sample.angular_acceleration)}
  ) {
  }
};

}  // namespace choreo
