// Copyright (c) Choreo contributors

#include "choreo/trajectory/SwerveSample.h"

#include <wpi/MathExtras.h>
#include <wpi/json.h>

#include "choreo/trajectory/TrajSample.h"

using namespace choreo::trajectory;

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

void choreo::trajectory::to_json(wpi::json& json,
                                 const SwerveSample& trajSample) {
  // convert unit checked arrays to raw double arrays
  std::array<double, 4> fx;
  std::transform(trajSample.moduleForcesX.begin(),
                 trajSample.moduleForcesX.end(), fx.begin(),
                 [](units::newton_t x) { return x.value(); });

  std::array<double, 4> fy;
  std::transform(trajSample.moduleForcesY.begin(),
                 trajSample.moduleForcesY.end(), fy.begin(),
                 [](units::newton_t x) { return x.value(); });

  json = wpi::json{{"t", trajSample.timestamp.value()},
                   {"x", trajSample.x.value()},
                   {"y", trajSample.y.value()},
                   {"heading", trajSample.heading.value()},
                   {"vx", trajSample.vx.value()},
                   {"vy", trajSample.vy.value()},
                   {"omega", trajSample.omega.value()},
                   {"ax", trajSample.ax.value()},
                   {"ay", trajSample.ay.value()},
                   {"alpha", trajSample.alpha.value()},
                   {"fx", fx},
                   {"fy", fy}};
}

void choreo::trajectory::from_json(const wpi::json& json,
                                   SwerveSample& trajSample) {
  trajSample.timestamp = units::second_t{json.at("t").get<double>()};
  trajSample.x = units::meter_t{json.at("x").get<double>()};
  trajSample.y = units::meter_t{json.at("y").get<double>()};
  trajSample.heading = units::radian_t{json.at("heading").get<double>()};
  trajSample.vx = units::meters_per_second_t{json.at("vx").get<double>()};
  trajSample.vy = units::meters_per_second_t{json.at("vy").get<double>()};
  trajSample.omega =
      units::radians_per_second_t{json.at("omega").get<double>()};
  trajSample.ax =
      units::meters_per_second_squared_t{json.at("ax").get<double>()};
  trajSample.ay =
      units::meters_per_second_squared_t{json.at("ay").get<double>()};
  trajSample.alpha =
      units::radians_per_second_squared_t{json.at("alpha").get<double>()};
  // these probably get optimized out anyways, but wanted to reduce accesses
  const auto& fx = json.at("fx");
  const auto& fy = json.at("fy");
  for (int i = 0; i < 4; ++i) {
    trajSample.moduleForcesX[i] = units::newton_t{fx.at(i).get<double>()};
    trajSample.moduleForcesY[i] = units::newton_t{fy.at(i).get<double>()};
  }
}
