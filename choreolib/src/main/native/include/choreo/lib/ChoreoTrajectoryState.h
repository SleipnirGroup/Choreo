// Copyright (c) Choreo contributors

#pragma once

#include <frc/geometry/Pose2d.h>
#include <frc/kinematics/ChassisSpeeds.h>
#include <wpi/json_fwd.h>

namespace choreolib {
class ChoreoTrajectoryState {
 public:
  ChoreoTrajectoryState();
  ChoreoTrajectoryState(units::second_t t, units::meter_t x, units::meter_t y,
                        units::radian_t heading,
                        units::meters_per_second_t xVel,
                        units::meters_per_second_t yVel,
                        units::radians_per_second_t angularVel);

  frc::Pose2d GetPose() const;
  frc::ChassisSpeeds GetChassisSpeeds() const;
  ChoreoTrajectoryState Interpolate(const ChoreoTrajectoryState& endValue,
                                    units::second_t t) const;
  std::array<double, 7> AsArray() const;
  ChoreoTrajectoryState Flipped() const;

  units::second_t timestamp;
  units::meter_t x;
  units::meter_t y;
  units::radian_t heading;
  units::meters_per_second_t velocityX;
  units::meters_per_second_t velocityY;
  units::radians_per_second_t angularVelocity;

 private:
  static constexpr units::meter_t fieldWidth{16.55445};
};

void to_json(wpi::json& json, const ChoreoTrajectoryState& trajState);
void from_json(const wpi::json& json, ChoreoTrajectoryState& trajState);
}  // namespace choreolib
