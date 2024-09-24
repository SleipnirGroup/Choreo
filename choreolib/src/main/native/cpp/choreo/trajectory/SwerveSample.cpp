// Copyright (c) Choreo contributors

#include "choreo/trajectory/SwerveSample.h"

#include <algorithm>

#include <wpi/MathExtras.h>
#include <wpi/json.h>

#include "choreo/trajectory/TrajectorySample.h"

using namespace choreo;

units::second_t SwerveSample::GetTimestamp() const {
  return timestamp;
}

frc::Pose2d SwerveSample::GetPose() const {
  return frc::Pose2d{x, y, frc::Rotation2d{heading}};
}

frc::ChassisSpeeds SwerveSample::GetChassisSpeeds() const {
  return frc::ChassisSpeeds{vx, vy, omega};
}

SwerveSample SwerveSample::OffsetBy(units::second_t timeStampOffset) const {
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

SwerveSample SwerveSample::Interpolate(const SwerveSample& endValue,
                                       units::second_t t) const {
  units::scalar_t scale = (t - timestamp) / (endValue.timestamp - timestamp);
  frc::Pose2d interpolatedPose =
      frc::Interpolate(GetPose(), endValue.GetPose(), scale.value());

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

void choreo::to_json(wpi::json& json, const SwerveSample& trajectorySample) {
  std::array<double, 4> fx;
  std::transform(trajectorySample.moduleForcesX.begin(),
                 trajectorySample.moduleForcesX.end(), fx.begin(),
                 [](units::newton_t x) { return x.value(); });

  std::array<double, 4> fy;
  std::transform(trajectorySample.moduleForcesY.begin(),
                 trajectorySample.moduleForcesY.end(), fy.begin(),
                 [](units::newton_t x) { return x.value(); });

  json = wpi::json{{"t", trajectorySample.timestamp.value()},
                   {"x", trajectorySample.x.value()},
                   {"y", trajectorySample.y.value()},
                   {"heading", trajectorySample.heading.value()},
                   {"vx", trajectorySample.vx.value()},
                   {"vy", trajectorySample.vy.value()},
                   {"omega", trajectorySample.omega.value()},
                   {"ax", trajectorySample.ax.value()},
                   {"ay", trajectorySample.ay.value()},
                   {"alpha", trajectorySample.alpha.value()},
                   {"fx", fx},
                   {"fy", fy}};
}

void choreo::from_json(const wpi::json& json, SwerveSample& trajectorySample) {
  trajectorySample.timestamp = units::second_t{json.at("t").get<double>()};
  trajectorySample.x = units::meter_t{json.at("x").get<double>()};
  trajectorySample.y = units::meter_t{json.at("y").get<double>()};
  trajectorySample.heading = units::radian_t{json.at("heading").get<double>()};
  trajectorySample.vx = units::meters_per_second_t{json.at("vx").get<double>()};
  trajectorySample.vy = units::meters_per_second_t{json.at("vy").get<double>()};
  trajectorySample.omega =
      units::radians_per_second_t{json.at("omega").get<double>()};
  trajectorySample.ax =
      units::meters_per_second_squared_t{json.at("ax").get<double>()};
  trajectorySample.ay =
      units::meters_per_second_squared_t{json.at("ay").get<double>()};
  trajectorySample.alpha =
      units::radians_per_second_squared_t{json.at("alpha").get<double>()};
  const auto& fx = json.at("fx");
  const auto& fy = json.at("fy");
  for (int i = 0; i < 4; ++i) {
    trajectorySample.moduleForcesX[i] = units::newton_t{fx.at(i).get<double>()};
    trajectorySample.moduleForcesY[i] = units::newton_t{fy.at(i).get<double>()};
  }
}
