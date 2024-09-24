// Copyright (c) Choreo contributors

#pragma once

#include <array>
#include <functional>

#include <units/acceleration.h>
#include <units/angle.h>
#include <units/angular_acceleration.h>
#include <units/angular_velocity.h>
#include <units/force.h>
#include <units/length.h>
#include <units/velocity.h>
#include <wpi/json_fwd.h>

#include "choreo/trajectory/TrajSample.h"
#include "choreo/util/AllianceFlipperUtil.h"

namespace choreo {
namespace trajectory {
class DifferentialSample {
 public:
  DifferentialSample() = default;
  DifferentialSample(units::second_t timestamp, units::meter_t x, units::meter_t y,
              units::radian_t heading, units::meters_per_second_t vl,
              units::meters_per_second_t vr,
              units::meters_per_second_squared_t al,
              units::meters_per_second_squared_t ar, units::newton_t fl,
              units::newton_t fr)
      : timestamp(timestamp),
        x(x),
        y(y),
        heading(heading),
        vl(vl),
        vr(vr),
        al(al),
        ar(ar),
        fl(fl),
        fr(fr) {}
  units::second_t GetTimestamp() const;
  frc::Pose2d GetPose() const;
  frc::ChassisSpeeds GetChassisSpeeds() const;
  template <int Year>
  DifferentialSample Flipped() const {
    static constexpr auto flipper = choreo::util::GetFlipperForYear<Year>();
    if constexpr (flipper.isMirrored) {
        return DifferentialSample(timestamp,
        flipper.FlipX(x),
        y,
        flipper.FlipHeading(heading),
        vl,
        vr,
        al,
        ar,
        fl,
        fr);
    } else {
        return DifferentialSample(timestamp,
        flipper.FlipX(x),
        flipper.FlipY(y),
        flipper.FlipHeading(heading),
        vr,
        vl,
        ar,
        al,
        fr,
        fl);
    }
  }
  DifferentialSample OffsetBy(units::second_t timeStampOffset) const;
  DifferentialSample Interpolate(const DifferentialSample& endValue, units::second_t t) const;

  units::second_t timestamp = 0_s;
  units::meter_t x = 0_m;
  units::meter_t y = 0_m;
  units::radian_t heading = 0_rad;
  units::meters_per_second_t vl = 0_mps;
  units::meters_per_second_t vr = 0_mps;
  units::meters_per_second_squared_t al = 0_mps_sq;
  units::meters_per_second_squared_t ar = 0_mps_sq;
  units::newton_t fl = 0_N;
  units::newton_t fr = 0_N;
};

void to_json(wpi::json& json, const DifferentialSample& trajSample);
void from_json(const wpi::json& json, DifferentialSample& trajSample);
}  // namespace trajectory
}  // namespace choreo

#include "choreo/trajectory/struct/DifferentialSampleStruct.h"
