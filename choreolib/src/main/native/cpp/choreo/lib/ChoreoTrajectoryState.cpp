#include "choreo/lib/ChoreoTrajectoryState.h"

#include <frc/geometry/Twist2d.h>

using namespace choreolib;

namespace frc {
frc::Pose2d Interpolate(const frc::Pose2d &startValue,
                        const frc::Pose2d &endValue, double t) {
  if (t < 0) {
    return startValue;
  } else if (t >= 1) {
    return endValue;
  } else {
    frc::Twist2d twist{startValue.Log(endValue)};
    frc::Twist2d scaledTwist = twist * t;
    return startValue.Exp(scaledTwist);
  }
}
} // namespace frc

ChoreoTrajectoryState::ChoreoTrajectoryState()
    : timestamp(0_s), x(0_m), y(0_m), heading(0_rad), velocityX(0_mps),
      velocityY(0_mps), angularVelocity(0_rad_per_s) {}

frc::Pose2d ChoreoTrajectoryState::GetPose() const {
  return frc::Pose2d{x, y, frc::Rotation2d{heading}};
}

frc::ChassisSpeeds ChoreoTrajectoryState::GetChassisSpeeds() const {
  return frc::ChassisSpeeds{velocityX, velocityY, angularVelocity};
}

ChoreoTrajectoryState
ChoreoTrajectoryState::Interpolate(const ChoreoTrajectoryState &endValue,
                                   units::second_t t) const {
  units::scalar_t scale = (t - timestamp) / (endValue.timestamp - timestamp);
  frc::Pose2d interpPose = frc::Interpolate(GetPose(), endValue, scale);
  return ChoreoTrajectoryState{
      .timestamp = 0_s,
      .x = interpPose.X(),
      .y = interpPose.Y(),
      .heading = interpPose.Rotation().Radians(),
      .velocityX = units::meters_per_second_t{std::lerp(
          velocityX.value(), endValue.velocityY.value(), scale)},
      .velocityY = units::meters_per_second_t{std::lerp(
          velocityY.value(), endValue.velocityY.value(), scale)},
      .angularVelocity = units::radians_per_second_t{std::lerp{
          angularVelocity.value(), endValue.angularVelocity.value()}}};
}

std::array<double, 7> ChoreoTrajectoryState::AsArray() const {
  return {timestamp.value(),      x.value(),         y.value(),
          heading.value(),        velocityX.value(), velocity.value(),
          angularVelocity.value()};
}

ChoreoTrajectoryState ChoreoTrajectoryState::Flipped() const {
  return ChoreoTrajectoryState{.timestamp = timestamp,
                               .x = fieldWidth - x,
                               .y = y,
                               .heading = std::numbers::pi - heading,
                               .velocityX = velocityX * -1,
                               .velocityY = velocityY,
                               .angularVelocity = angularVelocity * -1};
}
