// Copyright (c) Choreo contributors

#pragma once
#include <wpi/math/geometry/Pose2d.hpp>

#include "expr.hpp"
#include "wpi/units/angle.hpp"
#include "wpi/units/length.hpp"
#include "wpi/util/json.hpp"
namespace choreo {
struct Waypoint {
  Expr<wpi::units::meter_t> x = 1_m;
  Expr<wpi::units::meter_t> y = 0_m;
  Expr<wpi::units::radian_t> heading = 0_rad;
  uint64_t intervals = 0;
  bool split = false;
  bool fix_translation = false;
  bool fix_heading = false;
  bool override_intervals = false;
  bool is_initial_guess = false;

  wpi::math::Pose2d toPose2d() const {
    return wpi::math::Pose2d{x.unit(), y.unit(), heading.unit()};
  }

#ifdef WITH_TRAJOPT
  trajopt::Pose2d toTrajoptPose2d() const {
    return trajopt::Pose2d{x, y, {heading}};
  }
#endif
};

void to_json(wpi::util::json& json, const Waypoint& waypoint) {
  json = wpi::util::json::object(
      "x", waypoint.x, "y", waypoint.y, "heading", waypoint.heading,
      "intervals", waypoint.intervals, "split", waypoint.split,
      "fix_translation", waypoint.fix_translation, "fix_heading",
      waypoint.fix_heading, "override_intervals", waypoint.override_intervals,
      "is_initial_guess", waypoint.is_initial_guess);
}

void from_json(const wpi::util::json& json, Waypoint& waypoint) {
  waypoint.x = json.at("x").get<Expr<wpi::units::meter_t>>();
  waypoint.y = json.at("y").get<Expr<wpi::units::meter_t>>();
  waypoint.heading = json.at("heading").get<Expr<wpi::units::radian_t>>();
  waypoint.intervals = json.at("intervals").get_number();
  waypoint.split = json.at("split").get_bool();
  waypoint.fix_translation = json.at("fix_translation").get_bool();
  waypoint.fix_heading = json.at("fix_heading").get_bool();
  waypoint.override_intervals = json.at("override_intervals").get_bool();
  waypoint.is_initial_guess = json.at("is_initial_guess").get_bool();
}
}  // namespace choreo
