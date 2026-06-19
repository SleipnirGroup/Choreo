// Copyright (c) Choreo contributors

//     DifferentialDrive {
//     t: f64,
//     x: f64,
//     y: f64,
//     heading: f64,
//     vl: f64,
//     vr: f64,
//     omega: f64,
//     al: f64,
//     ar: f64,
//     alpha: f64,
//     fl: f64,
//     fr: f64,
// },

#pragma once

#include <wpi/units/acceleration.hpp>
#include <wpi/units/angle.hpp>
#include <wpi/units/angular_acceleration.hpp>
#include <wpi/units/angular_velocity.hpp>
#include <wpi/units/force.hpp>
#include <wpi/units/length.hpp>
#include <wpi/units/time.hpp>
#include <wpi/units/velocity.hpp>
#include <wpi/util/json.hpp>
#include <trajopt/differential_trajectory_generator.hpp>
namespace choreo {
struct DifferentialSample {
  using TrajoptSample = trajopt::DifferentialTrajectorySample;
  DifferentialSample() = default;
  static DifferentialSample fromJson(const wpi::util::json& json);
#ifdef WITH_TRAJOPT
  explicit DifferentialSample(const trajopt::DifferentialTrajectorySample& sample)
      : t(sample.timestamp),
        x(sample.x),
        y(sample.y),
        heading(sample.heading),
        vl(sample.velocity_l),
        vr(sample.velocity_r),
        omega(sample.angular_velocity),
        al(sample.acceleration_l),
        ar(sample.acceleration_r),
        alpha(sample.angular_acceleration),
        fl(sample.force_l),
        fr(sample.force_r) {}
#endif
  wpi::units::second_t t;
  wpi::units::meter_t x;
  wpi::units::meter_t y;
  wpi::units::radian_t heading;
  wpi::units::meters_per_second_t vl;
  wpi::units::meters_per_second_t vr;
  wpi::units::radian_t omega;
  wpi::units::meters_per_second_squared_t al;
  wpi::units::meters_per_second_squared_t ar;
  wpi::units::radian_t alpha;
  wpi::units::newton_t fl;
  wpi::units::newton_t fr;
};
inline void to_json(wpi::util::json& json, const DifferentialSample& sample) {
  json = wpi::util::json::object(
      "t", sample.t.value(), "x", sample.x.value(), "y", sample.y.value(),
      "heading", sample.heading.value(), "vl", sample.vl.value(), "vr",
      sample.vr.value(), "omega", sample.omega.value(), "al", sample.al.value(),
      "ar", sample.ar.value(), "alpha", sample.alpha.value(), "fl",
      sample.fl.value(), "fr", sample.fr.value());
}
inline void from_json(const wpi::util::json& json, DifferentialSample& sample) {
  sample.t = static_cast<wpi::units::second_t>(json.at("t").get_number());
  sample.x = static_cast<wpi::units::meter_t>(json.at("x").get_number());
  sample.y = static_cast<wpi::units::meter_t>(json.at("y").get_number());
  sample.heading =
      static_cast<wpi::units::radian_t>(json.at("heading").get_number());
  sample.vl =
      static_cast<wpi::units::meters_per_second_t>(json.at("vl").get_number());
  sample.vr =
      static_cast<wpi::units::meters_per_second_t>(json.at("vr").get_number());
  sample.omega =
      static_cast<wpi::units::radian_t>(json.at("omega").get_number());
  sample.al = static_cast<wpi::units::meters_per_second_squared_t>(
      json.at("al").get_number());
  sample.ar = static_cast<wpi::units::meters_per_second_squared_t>(
      json.at("ar").get_number());
  sample.alpha =
      static_cast<wpi::units::radian_t>(json.at("alpha").get_number());
  sample.fl = static_cast<wpi::units::newton_t>(json.at("fl").get_number());
  sample.fr = static_cast<wpi::units::newton_t>(json.at("fr").get_number());
}

inline DifferentialSample DifferentialSample::fromJson(
    const wpi::util::json& json) {
  DifferentialSample value;
  from_json(json, value);
  return value;
}

}  // namespace choreo
