// Copyright (c) Choreo contributors

#include "choreo/lib/ChoreoTrajectoryState.h"

#include <frc/geometry/Twist2d.h>
#include <wpi/MathExtras.h>
#include <wpi/json.h>

#include <algorithm>
#include <numbers>

using namespace choreolib;

namespace frc {
static constexpr frc::Pose2d Interpolate(const frc::Pose2d& startValue,
                                         const frc::Pose2d& endValue,
                                         double t) {
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
}  // namespace frc

ChoreoTrajectoryState::ChoreoTrajectoryState(
    units::second_t t, units::meter_t x, units::meter_t y,
    units::radian_t heading, units::meters_per_second_t xVel,
    units::meters_per_second_t yVel, units::radians_per_second_t angularVel,
    std::array<units::newton_t, 4> moduleForcesX,
    std::array<units::newton_t, 4> moduleForcesY)
    : timestamp(t),
      x(x),
      y(y),
      heading(heading),
      velocityX(xVel),
      velocityY(yVel),
      angularVelocity(angularVel),
      moduleForcesX(moduleForcesX),
      moduleForcesY(moduleForcesY) {}

frc::Pose2d ChoreoTrajectoryState::GetPose() const {
  return frc::Pose2d{x, y, frc::Rotation2d{heading}};
}

frc::ChassisSpeeds ChoreoTrajectoryState::GetChassisSpeeds() const {
  return frc::ChassisSpeeds{velocityX, velocityY, angularVelocity};
}

ChoreoTrajectoryState ChoreoTrajectoryState::Interpolate(
    const ChoreoTrajectoryState& endValue, double i) const {
  frc::Pose2d interpPose = frc::Interpolate(GetPose(), endValue.GetPose(), i);

  // TODO: Can this be done cleaner?
  std::array<units::newton_t, 4> lerpFX, lerpFY;
  for (int idx = 0; idx < 4; ++idx) {
    lerpFX[idx] = wpi::Lerp(moduleForcesX[idx], endValue.moduleForcesX[idx], i);
    lerpFY[idx] = wpi::Lerp(moduleForcesY[idx], endValue.moduleForcesY[idx], i);
  }

  return ChoreoTrajectoryState{
      wpi::Lerp(timestamp, endValue.timestamp, i),
      interpPose.X(),
      interpPose.Y(),
      interpPose.Rotation().Radians(),
      wpi::Lerp(velocityX, endValue.velocityX, i),
      wpi::Lerp(velocityY, endValue.velocityY, i),
      wpi::Lerp(angularVelocity, endValue.angularVelocity, i),
      lerpFX,
      lerpFY};
}

std::array<double, 7> ChoreoTrajectoryState::AsArray() const {
  return {timestamp.value(),      x.value(),         y.value(),
          heading.value(),        velocityX.value(), velocityY.value(),
          angularVelocity.value()};
}

ChoreoTrajectoryState ChoreoTrajectoryState::Flipped() const {
  std::array<units::newton_t, 4> newFX;
  // Does this have a performance downside?
  std::transform(moduleForcesX.begin(), moduleForcesX.end(), newFX.begin(),
                 std::negate<>{});

  return ChoreoTrajectoryState{timestamp,
                               fieldLength - x,
                               y,
                               units::radian_t{std::numbers::pi} - heading,
                               -velocityX,
                               velocityY,
                               -angularVelocity,
                               newFX,
                               moduleForcesY};
}

void choreolib::to_json(wpi::json& json,
                        const ChoreoTrajectoryState& trajState) {
  std::array<double, 4> fx, fy;
  std::transform(trajState.moduleForcesX.begin(), trajState.moduleForcesX.end(),
                 fx.begin(), [](units::newton_t x) { return x.value(); });
  std::transform(trajState.moduleForcesY.begin(), trajState.moduleForcesY.end(),
                 fy.begin(), [](units::newton_t x) { return x.value(); });

  json =
      wpi::json{{"timestamp", trajState.timestamp.value()},
                {"x", trajState.x.value()},
                {"y", trajState.y.value()},
                {"heading", trajState.heading.value()},
                {"velocityX", trajState.velocityX.value()},
                {"velocityY", trajState.velocityY.value()},
                {"angularVelocity", trajState.angularVelocity.value()},
                {"moduleForcesX", fx},  // TODO: Check that this actually works
                {"moduleForcesY", fy}};
}

void choreolib::from_json(const wpi::json& json,
                          ChoreoTrajectoryState& trajState) {
  trajState.timestamp = units::second_t{json.at("timestamp").get<double>()};
  trajState.x = units::meter_t{json.at("x").get<double>()};
  trajState.y = units::meter_t{json.at("y").get<double>()};
  trajState.heading = units::radian_t{json.at("heading").get<double>()};
  trajState.velocityX =
      units::meters_per_second_t{json.at("velocityX").get<double>()};
  trajState.velocityY =
      units::meters_per_second_t{json.at("velocityY").get<double>()};
  trajState.angularVelocity =
      units::radians_per_second_t{json.at("angularVelocity").get<double>()};

  // TODO: I should probably store the array object itself here. Probably gets optimized out, but good to be sure.
  for(int i = 0; i < 4; ++i) {
    trajState.moduleForcesX[i] = units::newton_t{json.at("moduleForcesX").at(i).get<double>()};
    trajState.moduleForcesY[i] = units::newton_t{json.at("moduleForcesY").at(i).get<double>()};
  }
}
