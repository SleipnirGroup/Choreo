// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <array>
#include <type_traits>

#include <frc/kinematics/ChassisSpeeds.h>
#include <units/acceleration.h>
#include <units/angle.h>
#include <units/angular_acceleration.h>
#include <units/angular_velocity.h>
#include <units/force.h>
#include <units/length.h>
#include <units/time.h>
#include <units/velocity.h>
#include <wpi/MathExtras.h>
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
  constexpr SwerveSample() = default;

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
   *   Module forces appear in the following order: [FL, FR, BL, BR].
   * @param moduleForcesY The force on each swerve module in the Y direction.
   *   Module forces appear in the following order: [FL, FR, BL, BR].
   */
  constexpr SwerveSample(units::second_t timestamp, units::meter_t x,
                         units::meter_t y, units::radian_t heading,
                         units::meters_per_second_t vx,
                         units::meters_per_second_t vy,
                         units::radians_per_second_t omega,
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
   *
   * @return The timestamp.
   */
  constexpr units::second_t GetTimestamp() const { return timestamp; }

  /**
   * Gets the Pose2d of the SwerveSample.
   *
   * @return The pose.
   */
  constexpr frc::Pose2d GetPose() const {
    return frc::Pose2d{x, y, frc::Rotation2d{heading}};
  }

  /**
   * Gets the field-relative chassis speeds of the SwerveSample.
   *
   * @return The field-relative chassis speeds.
   */
  constexpr frc::ChassisSpeeds GetChassisSpeeds() const {
    return frc::ChassisSpeeds{vx, vy, omega};
  }

  /**
   * Returns the current sample flipped based on the field year.
   *
   * @tparam Year The field year.
   * @return SwerveSample that is flipped based on the field layout.
   */
  template <int Year = util::kDefaultYear>
  constexpr SwerveSample Flipped() const {
    constexpr auto flipper = choreo::util::GetFlipperForYear<Year>();
    if constexpr (flipper.isMirrored) {
      return SwerveSample{timestamp,
                          flipper.FlipX(x),
                          flipper.FlipY(y),
                          flipper.FlipHeading(heading),
                          -vx,
                          vy,
                          -omega,
                          -ax,
                          ay,
                          -alpha,
                          // FL, FR, BL, BR
                          // Mirrored
                          // -FR, -FL, -BR, -BL
                          {-moduleForcesX[1], -moduleForcesX[0],
                           -moduleForcesX[3], -moduleForcesX[2]},
                          // FL, FR, BL, BR
                          // Mirrored
                          // -FR, -FL, -BR, -BL
                          {moduleForcesY[1], moduleForcesY[0], moduleForcesY[3],
                           moduleForcesY[2]}};
    } else {
      return SwerveSample{timestamp,
                          flipper.FlipX(x),
                          flipper.FlipY(y),
                          flipper.FlipHeading(heading),
                          -vx,
                          -vy,
                          omega,
                          -ax,
                          -ay,
                          alpha,
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
   * @return SwerveSample that is moved forward by the offset
   */
  constexpr SwerveSample OffsetBy(units::second_t timeStampOffset) const {
    return SwerveSample{timestamp + timeStampOffset,
                        x,
                        y,
                        heading,
                        vx,
                        vy,
                        omega,
                        ax,
                        ay,
                        alpha,
                        moduleForcesX,
                        moduleForcesY};
  }

  /**
   * Interpolates between endValue and this by t
   *
   * @param endValue the end interpolated value
   * @param t time to move sample by
   * @return the interpolated sample
   */
  constexpr SwerveSample Interpolate(const SwerveSample& endValue,
                                     units::second_t t) const {
    units::scalar_t scale = (t - timestamp) / (endValue.timestamp - timestamp);
    frc::Pose2d interpolatedPose =
        GetPose().Exp(GetPose().Log(endValue.GetPose()) * scale.value());

    std::array<units::newton_t, 4> interpolatedForcesX;
    std::array<units::newton_t, 4> interpolatedForcesY;
    for (int i = 0; i < 4; i++) {
      interpolatedForcesX[i] =
          wpi::Lerp(moduleForcesX[i], endValue.moduleForcesX[i], scale.value());
      interpolatedForcesY[i] =
          wpi::Lerp(moduleForcesY[i], endValue.moduleForcesY[i], scale.value());
    }

    return SwerveSample{wpi::Lerp(timestamp, endValue.timestamp, scale),
                        interpolatedPose.X(),
                        interpolatedPose.Y(),
                        interpolatedPose.Rotation().Radians(),
                        wpi::Lerp(vx, endValue.vx, scale),
                        wpi::Lerp(vy, endValue.vy, scale),
                        wpi::Lerp(omega, endValue.omega, scale),
                        wpi::Lerp(ax, endValue.ax, scale),
                        wpi::Lerp(ay, endValue.ay, scale),
                        wpi::Lerp(alpha, endValue.alpha, scale),
                        interpolatedForcesX,
                        interpolatedForcesY};
  }

  /**
   * SwerveSample equality operator.
   *
   * @param other The other SwerveSample.
   * @return True for equality.
   */
  constexpr bool operator==(const SwerveSample& other) const {
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

  /// The timestamp of this sample relative to the beginning of the trajectory.
  units::second_t timestamp = 0_s;

  /// The X position of the sample relative to the blue alliance wall origin.
  units::meter_t x = 0_m;

  /// The Y position of the sample relative to the blue alliance wall origin.
  units::meter_t y = 0_m;

  /// The heading of the sample, with 0 being in the +X direction.
  units::radian_t heading = 0_rad;

  /// The velocity of the sample in the X direction.
  units::meters_per_second_t vx = 0_mps;

  /// The velocity of the sample in the Y direction.
  units::meters_per_second_t vy = 0_mps;

  /// The angular velocity of the sample.
  units::radians_per_second_t omega = 0_rad_per_s;

  /// The acceleration of the in the X direction.
  units::meters_per_second_squared_t ax = 0_mps_sq;

  /// The acceleration of the in the Y direction.
  units::meters_per_second_squared_t ay = 0_mps_sq;

  /// The angular acceleration of the sample.
  units::radians_per_second_squared_t alpha = 0_rad_per_s_sq;

  /// The force on each swerve module in the X direction. Module forces appear
  /// in the following order: [FL, FR, BL, BR].
  std::array<units::newton_t, 4> moduleForcesX{0_N, 0_N, 0_N, 0_N};

  /// The force on each swerve module in the Y direction. Module forces appear
  /// in the following order: [FL, FR, BL, BR].
  std::array<units::newton_t, 4> moduleForcesY{0_N, 0_N, 0_N, 0_N};
};

void to_json(wpi::json& json, const SwerveSample& trajectorySample);
void from_json(const wpi::json& json, SwerveSample& trajectorySample);

}  // namespace choreo

#include "choreo/trajectory/struct/SwerveSampleStruct.h"
