// Copyright (c) Choreo contributors

#include "choreo/trajectory/DifferentialSample.h"

#include <wpi/MathExtras.h>
#include <wpi/json.h>

#include "choreo/Choreo.h"
#include "choreo/trajectory/TrajectorySample.h"

using namespace choreo;

units::second_t DifferentialSample::GetTimestamp() const {
  return timestamp;
}

frc::Pose2d DifferentialSample::GetPose() const {
  return frc::Pose2d{x, y, frc::Rotation2d{heading}};
}

frc::ChassisSpeeds DifferentialSample::GetChassisSpeeds() const {
  return frc::ChassisSpeeds{
      (vl + vr) / 2.0, 0_mps,
      (vr - vl) /
          units::meter_t{choreo::Choreo::GetProjectFile()
                             .config.differentialTrackWidth.val} *
          1_rad};
}

DifferentialSample DifferentialSample::OffsetBy(
    units::second_t timeStampOffset) const {
  return DifferentialSample{
      timestamp + timeStampOffset, x, y, heading, vl, vr, al, ar, fl, fr};
}

DifferentialSample DifferentialSample::Interpolate(
    const DifferentialSample& endValue, units::second_t t) const {
  units::scalar_t scale = (t - timestamp) / (endValue.timestamp - timestamp);
  frc::Pose2d interpolatedPose =
      frc::Interpolate(GetPose(), endValue.GetPose(), scale.value());

  return DifferentialSample{
      wpi::Lerp(timestamp, endValue.timestamp, scale),
      interpolatedPose.X(),
      interpolatedPose.Y(),
      interpolatedPose.Rotation().Radians(),
      wpi::Lerp(vl, endValue.vl, scale),
      wpi::Lerp(vr, endValue.vr, scale),
      wpi::Lerp(al, endValue.al, scale),
      wpi::Lerp(ar, endValue.ar, scale),
      wpi::Lerp(fl, endValue.fl, scale),
      wpi::Lerp(fr, endValue.fr, scale),
  };
}

void choreo::to_json(wpi::json& json,
                     const DifferentialSample& trajectorySample) {
  json = wpi::json{{"t", trajectorySample.timestamp.value()},
                   {"x", trajectorySample.x.value()},
                   {"y", trajectorySample.y.value()},
                   {"heading", trajectorySample.heading.value()},
                   {"vl", trajectorySample.vl.value()},
                   {"vr", trajectorySample.vr.value()},
                   {"al", trajectorySample.al.value()},
                   {"ar", trajectorySample.ar.value()},
                   {"fl", trajectorySample.fl.value()},
                   {"fr", trajectorySample.fr.value()}};
}

void choreo::from_json(const wpi::json& json,
                       DifferentialSample& trajectorySample) {
  trajectorySample.timestamp = units::second_t{json.at("t").get<double>()};
  trajectorySample.x = units::meter_t{json.at("x").get<double>()};
  trajectorySample.y = units::meter_t{json.at("y").get<double>()};
  trajectorySample.heading = units::radian_t{json.at("heading").get<double>()};
  trajectorySample.vl = units::meters_per_second_t{json.at("vl").get<double>()};
  trajectorySample.vr = units::meters_per_second_t{json.at("vr").get<double>()};
  trajectorySample.al =
      units::meters_per_second_squared_t{json.at("al").get<double>()};
  trajectorySample.ar =
      units::meters_per_second_squared_t{json.at("ar").get<double>()};
  trajectorySample.fl = units::newton_t{json.at("fl").get<double>()};
  trajectorySample.fr = units::newton_t{json.at("fr").get<double>()};
}
