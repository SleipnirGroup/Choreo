// Copyright (c) Choreo contributors

#include "choreo/trajectory/DiffySample.h"

#include <wpi/MathExtras.h>
#include <wpi/json.h>

#include "choreo/Choreo.h"
#include "choreo/trajectory/TrajSample.h"

using namespace choreo::trajectory;

units::second_t DiffySample::GetTimestamp() const {
  return timestamp;
}

frc::Pose2d DiffySample::GetPose() const {
  return frc::Pose2d{x, y, frc::Rotation2d{heading}};
}

frc::ChassisSpeeds DiffySample::GetChassisSpeeds() const {
  return frc::ChassisSpeeds{
      (vl + vr) / 2.0, 0.0_mps,
      (vr - vl) /
          units::meter_t{
              choreo::Choreo::GetProjectFile().config.diffTrackWidth.val} *
          1_rad};
}

DiffySample DiffySample::OffsetBy(units::second_t timeStampOffset) const {
  return DiffySample{
      timestamp + timeStampOffset, x, y, heading, vl, vr, al, ar, fl, fr};
}

DiffySample DiffySample::Interpolate(const DiffySample& endValue,
                                     units::second_t t) const {
  units::scalar_t scale = (t - timestamp) / (endValue.timestamp - timestamp);
  frc::Pose2d interpolatedPose =
      frc::Interpolate(GetPose(), endValue.GetPose(), scale.value());

  return DiffySample{
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

void choreo::trajectory::to_json(wpi::json& json,
                                 const DiffySample& trajSample) {
  json = wpi::json{{"t", trajSample.timestamp.value()},
                   {"x", trajSample.x.value()},
                   {"y", trajSample.y.value()},
                   {"heading", trajSample.heading.value()},
                   {"vl", trajSample.vl.value()},
                   {"vr", trajSample.vr.value()},
                   {"al", trajSample.al.value()},
                   {"ar", trajSample.ar.value()},
                   {"fl", trajSample.fl.value()},
                   {"fr", trajSample.fr.value()}};
}

void choreo::trajectory::from_json(const wpi::json& json,
                                   DiffySample& trajSample) {
  trajSample.timestamp = units::second_t{json.at("t").get<double>()};
  trajSample.x = units::meter_t{json.at("x").get<double>()};
  trajSample.y = units::meter_t{json.at("y").get<double>()};
  trajSample.heading = units::radian_t{json.at("heading").get<double>()};
  trajSample.vl = units::meters_per_second_t{json.at("vl").get<double>()};
  trajSample.vr = units::meters_per_second_t{json.at("vr").get<double>()};
  trajSample.al =
      units::meters_per_second_squared_t{json.at("al").get<double>()};
  trajSample.ar =
      units::meters_per_second_squared_t{json.at("ar").get<double>()};
  trajSample.fl = units::newton_t{json.at("fl").get<double>()};
  trajSample.fr = units::newton_t{json.at("fr").get<double>()};
}
