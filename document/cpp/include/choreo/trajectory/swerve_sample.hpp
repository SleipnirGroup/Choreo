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
#include <trajopt/swerve_trajectory_generator.hpp>
#include "choreo/geometry/force_vector.hpp"
namespace choreo {
struct SwerveSample : public wpi::math::TrajectorySample {
  using TrajoptSample = trajopt::SwerveTrajectorySample;
  /**
   * The forces applied by each wheel at this sample, in the x direction (in the field reference frame).
   */
  std::array<ForceVector2d, 4> forces;

  SwerveSample() = default;
  constexpr SwerveSample(const trajopt::SwerveTrajectorySample& sample) : wpi::math::TrajectorySample(
    wpi::units::second_t(sample.timestamp),
    {wpi::units::meter_t(sample.x), wpi::units::meter_t(sample.y), wpi::units::radian_t(sample.heading)},
    {wpi::units::meters_per_second_t(sample.velocity_x), wpi::units::meters_per_second_t(sample.velocity_y), wpi::units::radians_per_second_t(sample.angular_velocity)},
    {wpi::units::meters_per_second_squared_t(sample.acceleration_x), wpi::units::meters_per_second_squared_t(sample.acceleration_y), wpi::units::radians_per_second_squared_t(sample.angular_acceleration)})
  {
    // Ensure that the module forces arrays have exactly 4 elements.
    //assert(sample.module_forces_x.size() == 4 && sample.module_forces_y.size() == 4, "Module forces from TrajoptLib must have exactly 4 elements.");
    forces = {
      ForceVector2d(wpi::units::newton_t(sample.module_forces_x[0]), wpi::units::newton_t(sample.module_forces_y[0])),
      ForceVector2d(wpi::units::newton_t(sample.module_forces_x[1]), wpi::units::newton_t(sample.module_forces_y[1])),
      ForceVector2d(wpi::units::newton_t(sample.module_forces_x[2]), wpi::units::newton_t(sample.module_forces_y[2])),
      ForceVector2d(wpi::units::newton_t(sample.module_forces_x[3]), wpi::units::newton_t(sample.module_forces_y[3]))
    };
  }
  constexpr SwerveSample(wpi::units::second_t time, const wpi::math::Pose2d& p,
                             const wpi::math::ChassisVelocities& v,
                             const wpi::math::ChassisAccelerations& a, const std::array<ForceVector2d, 4> f)
      : TrajectorySample(time, p, v, a), forces(f) {}
  constexpr bool operator==(const SwerveSample& other) {
    return wpi::math::TrajectorySample::operator==(other) && std::equal(forces.begin(), forces.end(), other.forces.begin());
  };
  constexpr SwerveSample Transform(const wpi::math::Transform2d& transform) const {
    wpi::math::TrajectorySample baseSample = wpi::math::TrajectorySample::Transform(transform);
    const std::array<ForceVector2d, 4>& transformedForces = {
      forces[0].RotateBy(transform.Rotation()),
      forces[1].RotateBy(transform.Rotation()),
      forces[2].RotateBy(transform.Rotation()),
      forces[3].RotateBy(transform.Rotation())
    };
    return SwerveSample(


        baseSample.timestamp,
        baseSample.pose,
        baseSample.velocity,
        baseSample.acceleration,
        transformedForces
    );
  }
  constexpr SwerveSample RelativeTo(const wpi::math::Pose2d& other) const {
    TrajectorySample baseSample = wpi::math::TrajectorySample::RelativeTo(other);
    const std::array<ForceVector2d, 4> relativeForces = {
      forces[0].RotateBy(-other.Rotation()),
      forces[1].RotateBy(-other.Rotation()),
      forces[2].RotateBy(-other.Rotation()),
      forces[3].RotateBy(-other.Rotation())
    };
    return SwerveSample(
        baseSample.timestamp,
        baseSample.pose,
        baseSample.velocity,
        baseSample.acceleration,
        relativeForces
    );



}};}  // namespace choreo
