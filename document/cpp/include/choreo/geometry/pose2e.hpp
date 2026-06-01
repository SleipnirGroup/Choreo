// Copyright (c) Choreo contributors

#pragma once

#include <wpi/math/geometry/Pose2d.hpp>
#include <wpi/units/length.hpp>
#include <wpi/units/angle.hpp>
#include <wpi/util/json.hpp>

#include "../expr.hpp"
#include "type_traits"
#ifdef WITH_TRAJOPT
#include <trajopt/geometry/pose2.hpp>
#endif

namespace choreo {
/// Represents the location of a wheel on the robot, relative to the robot's
/// center. Standard configuration is FL: (+x, +y), BL: (+x, -y), BR: (-x, -y),
/// FR: (-x, +y)
struct Pose2e {
  Expr<wpi::units::meter_t> x;
  Expr<wpi::units::meter_t> y;
  Expr<wpi::units::radian_t> heading;

  operator wpi::math::Pose2d() {
    return wpi::math::Pose2d{x.unit(), y.unit(), {heading.unit()}};
  }

#ifdef WITH_TRAJOPT
  operator trajopt::Pose2d() { return trajopt::Pose2d{x, y, {heading}}; }
#endif
};

inline void to_json(wpi::util::json& json, const Pose2e& pose) {
  json = wpi::util::json::object("x", pose.x, "y", pose.y, "heading", pose.heading);
}

inline void from_json(const wpi::util::json& json, Pose2e& pose) {
  pose.x = json.at("x").get<choreo::Expr<wpi::units::meter_t>>();
  pose.y = json.at("y").get<choreo::Expr<wpi::units::meter_t>>();
  pose.heading = json.at("heading").get<choreo::Expr<wpi::units::radian_t>>();
}
}  // namespace choreo
