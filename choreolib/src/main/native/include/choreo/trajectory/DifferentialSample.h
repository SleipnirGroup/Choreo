// Copyright (c) Choreo contributors

#pragma once

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

class DifferentialSample {
 public:
  /**
   * Constructs a DifferentialSample that is defaulted.
   */
  DifferentialSample() = default;

  /**
   * Constructs a DifferentialSample with the specified parameters.
   *
   * @param timestamp The timestamp of this sample, relative to the beginning of
   * the trajectory.
   * @param x The X position of the sample
   * @param y The Y position of the sample
   * @param heading The heading of the sample, with 0 being in the +X direction.
   * @param vl The velocity of the left wheels
   * @param vr The velocity of the right wheels
   * @param al The acceleration of the left wheels
   * @param ar The acceleration of the left wheels
   * @param fl The force of the left wheels
   * @param fr The force of the right wheels
   */
  DifferentialSample(units::second_t timestamp, units::meter_t x,
                     units::meter_t y, units::radian_t heading,
                     units::meters_per_second_t vl,
                     units::meters_per_second_t vr,
                     units::meters_per_second_squared_t al,
                     units::meters_per_second_squared_t ar, units::newton_t fl,
                     units::newton_t fr)
      : timestamp{timestamp},
        x{x},
        y{y},
        heading{heading},
        vl{vl},
        vr{vr},
        al{al},
        ar{ar},
        fl{fl},
        fr{fr} {}

  /**
   * Gets the timestamp of the DifferentialSample.
   */
  units::second_t GetTimestamp() const;

  /**
   * Gets the Pose2d of the DifferentialSample.
   */
  frc::Pose2d GetPose() const;

  /**
   * Gets the field relative chassis speeds of the DifferentialSample.
   */
  frc::ChassisSpeeds GetChassisSpeeds() const;

  /**
   * Returns the current sample offset by a the time offset passed in.
   *
   * @param timeStampOffset time to move sample by
   * @returns DifferentialSample that is moved forward by the offset
   */
  DifferentialSample OffsetBy(units::second_t timeStampOffset) const;

  /**
   * Interpolates between endValue and this by t
   *
   * @param endValue the end interpolated value
   * @param t time to move sample by
   * @returns the interpolated sample
   */
  DifferentialSample Interpolate(const DifferentialSample& endValue,
                                 units::second_t t) const;

  /**
   * Returns the current sample flipped based on the field year.
   *
   * @tparam Year The field year.
   * @returns DifferentialSample that is flipped based on the field layout.
   */
  template <int Year>
  DifferentialSample Flipped() const {
    static constexpr auto flipper = choreo::util::GetFlipperForYear<Year>();
    if constexpr (flipper.isMirrored) {
      return DifferentialSample(timestamp, flipper.FlipX(x), y,
                                flipper.FlipHeading(heading), vl, vr, al, ar,
                                fl, fr);
    } else {
      return DifferentialSample(timestamp, flipper.FlipX(x), flipper.FlipY(y),
                                flipper.FlipHeading(heading), vr, vl, ar, al,
                                fr, fl);
    }
  }

  /**
   * Comparison operators for differential samples.
   */
  bool operator==(const DifferentialSample& other) const {
    constexpr double epsilon = 1e-6;

    auto compare_units = [epsilon](const auto& a, const auto& b) {
      using UnitType =
          std::remove_const_t<std::remove_reference_t<decltype(a)>>;
      return units::math::abs(a - b) < UnitType(epsilon);
    };

    return compare_units(timestamp, other.timestamp) &&
           compare_units(x, other.x) && compare_units(y, other.y) &&
           compare_units(heading, other.heading) &&
           compare_units(vl, other.vl) && compare_units(vr, other.vr) &&
           compare_units(al, other.al) && compare_units(ar, other.ar) &&
           compare_units(fl, other.fl) && compare_units(fr, other.fr);
  }

  bool operator!=(const DifferentialSample& other) const {
    return !(*this == other);
  }

  /// The timestamp of this sample, relative to the beginning of the trajectory.
  units::second_t timestamp = 0_s;

  /// The X position of the sample
  units::meter_t x = 0_m;

  /// The Y position of the sample
  units::meter_t y = 0_m;

  /// The heading of the sample, with 0 being in the +X direction
  units::radian_t heading = 0_rad;

  /// The velocity of the left wheels
  units::meters_per_second_t vl = 0_mps;

  /// The velocity of the right wheels
  units::meters_per_second_t vr = 0_mps;

  /// The acceleration of the left wheels
  units::meters_per_second_squared_t al = 0_mps_sq;

  /// The acceleration of the right wheels
  units::meters_per_second_squared_t ar = 0_mps_sq;

  /// The force of the left wheels
  units::newton_t fl = 0_N;

  /// The force of the right wheels
  units::newton_t fr = 0_N;
};

void to_json(wpi::json& json, const DifferentialSample& trajectorySample);
void from_json(const wpi::json& json, DifferentialSample& trajectorySample);

}  // namespace choreo

#include "choreo/trajectory/struct/DifferentialSampleStruct.h"
