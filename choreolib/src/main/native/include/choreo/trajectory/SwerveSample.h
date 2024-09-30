// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <array>

#include <frc/kinematics/ChassisSpeeds.h>
#include <units/acceleration.h>
#include <units/angle.h>
#include <units/angular_acceleration.h>
#include <units/angular_velocity.h>
#include <units/force.h>
#include <units/length.h>
#include <units/velocity.h>
#include <wpi/json_fwd.h>

#include "choreo/util/AllianceFlipperUtil.h"

namespace choreo {

/**
 * A single swerve robot sample in a Trajectory.
 */
class SwerveSample {
 public:
  /**
   * Constructs a SwerveSample that is defaulted.
   */
  SwerveSample() = default;

  /**
   * Constructs a SwerveSample with the specified parameters.
   *
   * @param timestamp The timestamp of this sample, relative to the beginning of
   * the trajectory.
   * @param x The X position of the sample
   * @param y The Y position of the sample
   * @param heading The heading of the sample, with 0 being in the +X direction.
   * @param vx The velocity of the sample in the X direction.
   * @param vy The velocity of the sample in the Y direction.
   * @param omega The angular velocity of the sample.
   * @param ax The acceleration of the sample in the X direction.
   * @param ay The acceleration of the sample in the Y direction.
   * @param alpha The angular acceleration of the sample.
   * @param moduleForcesX The force on each swerve module in the X direction.
   * @param moduleForcesY The force on each swerve module in the Y direction.
   */
  SwerveSample(units::second_t timestamp, units::meter_t x, units::meter_t y,
               units::radian_t heading, units::meters_per_second_t vx,
               units::meters_per_second_t vy, units::radians_per_second_t omega,
               units::meters_per_second_squared_t ax,
               units::meters_per_second_squared_t ay,
               units::radians_per_second_squared_t alpha,
               std::array<units::newton_t, 4> moduleForcesX,
               std::array<units::newton_t, 4> moduleForcesY)
      : timestamp{timestamp},
        x{x},
        y{y},
        heading{heading},
        vx{vx},
        vy{vy},
        omega{omega},
        ax{ax},
        ay{ay},
        alpha{alpha},
        moduleForcesX{moduleForcesX},
        moduleForcesY{moduleForcesY} {}

  /**
   * Gets the timestamp of the SwerveSample.
   */
  units::second_t GetTimestamp() const;

  /**
   * Gets the Pose2d of the SwerveSample.
   */
  frc::Pose2d GetPose() const;

  /**
   * Gets the field relative chassis speeds of the SwerveSample.
   */
  frc::ChassisSpeeds GetChassisSpeeds() const;

  /**
   * Returns the current sample flipped based on the field year.
   *
   * @tparam Year The field year.
   * @returns SwerveSample that is flipped based on the field layout.
   */
  template <int Year>
  SwerveSample Flipped() const {
    static constexpr auto flipper = choreo::util::GetFlipperForYear<Year>();
    if constexpr (flipper.isMirrored) {
      return SwerveSample{timestamp,
                          flipper.FlipX(x),
                          y,
                          flipper.FlipHeading(heading),
                          -vx,
                          vy,
                          -omega,
                          -ax,
                          ay,
                          -alpha,
                          {-moduleForcesX[3], -moduleForcesX[2],
                           -moduleForcesX[1], -moduleForcesX[0]},
                          {moduleForcesY[3], moduleForcesY[2], moduleForcesY[1],
                           moduleForcesY[0]}};
    } else {
      return SwerveSample{timestamp,
                          flipper.FlipX(x),
                          flipper.FlipY(y),
                          flipper.FlipHeading(heading),
                          -vx,
                          -vy,
                          -omega,
                          -ax,
                          -ay,
                          -alpha,
                          {-moduleForcesX[0], -moduleForcesX[1],
                           -moduleForcesX[2], -moduleForcesX[3]},
                          {-moduleForcesY[0], -moduleForcesY[1],
                           -moduleForcesY[2], -moduleForcesY[3]}};
    }
  }

  /**
   * Returns the current sample offset by a the time offset passed in.
   *
   * @param timeStampOffset time to move sample by
   * @returns SwerveSample that is moved forward by the offset
   */
  SwerveSample OffsetBy(units::second_t timeStampOffset) const;

  /**
   * Interpolates between endValue and this by t
   *
   * @param endValue the end interpolated value
   * @param t time to move sample by
   * @returns the interpolated sample
   */
  SwerveSample Interpolate(const SwerveSample& endValue,
                           units::second_t t) const;

  /**
   * Comparison operators for swerve samples.
   */
  bool operator==(const SwerveSample& other) const {
    constexpr double epsilon = 1e-6;

    auto compare_units = [epsilon](const auto& a, const auto& b) {
      using UnitType =
          std::remove_const_t<std::remove_reference_t<decltype(a)>>;
      return units::math::abs(a - b) < UnitType(epsilon);
    };

    auto compare_arrays = [&compare_units](const auto& arr1, const auto& arr2) {
      return std::equal(arr1.begin(), arr1.end(), arr2.begin(), compare_units);
    };

    return compare_units(timestamp, other.timestamp) &&
           compare_units(x, other.x) && compare_units(y, other.y) &&
           compare_units(heading, other.heading) &&
           compare_units(vx, other.vx) && compare_units(vy, other.vy) &&
           compare_units(omega, other.omega) && compare_units(ax, other.ax) &&
           compare_units(ay, other.ay) && compare_units(alpha, other.alpha) &&
           compare_arrays(moduleForcesX, other.moduleForcesX) &&
           compare_arrays(moduleForcesY, other.moduleForcesY);
  }

  bool operator!=(const SwerveSample& other) const { return !(*this == other); }

  /// The timestamp of this sample, relative to the beginning of the trajectory.
  units::second_t timestamp = 0_s;

  /// The X position of the sample
  units::meter_t x = 0_m;

  /// The Y position of the sample
  units::meter_t y = 0_m;

  /// The heading of the sample, with 0 being in the +X direction
  units::radian_t heading = 0_rad;

  /// The velocity of the sample in the X direction
  units::meters_per_second_t vx = 0_mps;

  /// The velocity of the sample in the Y direction
  units::meters_per_second_t vy = 0_mps;

  /// The angular velocity of the sample
  units::radians_per_second_t omega = 0_rad_per_s;

  /// The acceleration of the in the X direction
  units::meters_per_second_squared_t ax = 0_mps_sq;

  /// The acceleration of the in the Y direction
  units::meters_per_second_squared_t ay = 0_mps_sq;

  /// The angular acceleration of the sample
  units::radians_per_second_squared_t alpha = 0_rad_per_s_sq;

  /// The force on each swerve module in the X direction Module forces appear in
  /// the following order: [FL, FR, BL, BR]
  std::array<units::newton_t, 4> moduleForcesX{0_N, 0_N, 0_N, 0_N};

  /// The force on each swerve module in the Y direction Module forces appear in
  /// the following order: [FL, FR, BL, BR]
  std::array<units::newton_t, 4> moduleForcesY{0_N, 0_N, 0_N, 0_N};
};

void to_json(wpi::json& json, const SwerveSample& TrajectorySample);
void from_json(const wpi::json& json, SwerveSample& TrajectorySample);

}  // namespace choreo

#include "choreo/trajectory/struct/SwerveSampleStruct.h"
