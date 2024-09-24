// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
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
class SwerveSample {
 public:
  SwerveSample() = default;
  SwerveSample(units::second_t timestamp, units::meter_t x, units::meter_t y,
               units::radian_t heading, units::meters_per_second_t vx,
               units::meters_per_second_t vy, units::radians_per_second_t omega,
               units::meters_per_second_squared_t ax,
               units::meters_per_second_squared_t ay,
               units::radians_per_second_squared_t alpha,
               std::array<units::newton_t, 4> moduleForcesX,
               std::array<units::newton_t, 4> moduleForcesY)
      : timestamp(timestamp),
        x(x),
        y(y),
        heading(heading),
        vx(vx),
        vy(vy),
        omega(omega),
        ax(ax),
        ay(ay),
        alpha(alpha),
        moduleForcesX(moduleForcesX),
        moduleForcesY(moduleForcesY) {}
  units::second_t GetTimestamp() const;
  frc::Pose2d GetPose() const;
  frc::ChassisSpeeds GetChassisSpeeds() const;
  template <int Year>
  SwerveSample Flipped() const {
    static constexpr auto flipper = choreo::util::GetFlipperForYear<Year>();
    if constexpr (flipper.isMirrored) {
        return SwerveSample(timestamp,
        flipper.FlipX(x),
        flipper.FlipY(y),
        flipper.FlipHeading(heading),
        -vx,
        vy,
        -omega,
        -ax,
        ay,
        -alpha,
        {-moduleForcesX[3], -moduleForcesX[2], -moduleForcesX[1], -moduleForcesX[0]},
        {moduleForcesY[3], moduleForcesY[2], moduleForcesY[1], moduleForcesY[0]});
    } else {
        return SwerveSample(timestamp,
        flipper.FlipX(x),
        flipper.FlipY(y),
        flipper.FlipHeading(heading),
        -vx,
        -vy,
        -omega,
        -ax,
        -ay,
        -alpha,
        {-moduleForcesX[0], -moduleForcesX[1], -moduleForcesX[2], -moduleForcesX[3]},
        {-moduleForcesY[0], -moduleForcesY[1], -moduleForcesY[2], -moduleForcesY[3]});
    }
  }
  SwerveSample OffsetBy(units::second_t timeStampOffset) const;
  SwerveSample Interpolate(const SwerveSample& endValue,
                           units::second_t t) const;

  units::second_t timestamp = 0_s;
  units::meter_t x = 0_m;
  units::meter_t y = 0_m;
  units::radian_t heading = 0_rad;
  units::meters_per_second_t vx = 0_mps;
  units::meters_per_second_t vy = 0_mps;
  units::radians_per_second_t omega = 0_rad_per_s;
  units::meters_per_second_squared_t ax = 0_mps_sq;
  units::meters_per_second_squared_t ay = 0_mps_sq;
  units::radians_per_second_squared_t alpha = 0_rad_per_s_sq;
  std::array<units::newton_t, 4> moduleForcesX{0_N, 0_N, 0_N, 0_N};
  std::array<units::newton_t, 4> moduleForcesY{0_N, 0_N, 0_N, 0_N};
};

void to_json(wpi::json& json, const SwerveSample& trajSample);
void from_json(const wpi::json& json, SwerveSample& trajSample);
}  // namespace trajectory
}  // namespace choreo

#include "choreo/trajectory/struct/SwerveSampleStruct.h"
