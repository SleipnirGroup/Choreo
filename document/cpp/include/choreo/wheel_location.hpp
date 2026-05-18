// Copyright (c) Choreo contributors

#pragma once

#include <wpi/math/geometry/Translation2d.hpp>
#include <wpi/units/length.hpp>
#include <wpi/util/json.hpp>

#include "expr.hpp"
#include "type_traits"
#ifdef WITH_TRAJOPT
#include <trajopt/geometry/translation2.hpp>
#endif

namespace choreo {
/// Represents the location of a wheel on the robot, relative to the robot's
/// center. Standard configuration is FL: (+x, +y), BL: (+x, -y), BR: (-x, -y),
/// FR: (-x, +y)
struct WheelLocation {
  Expr<wpi::units::meter_t> x;
  Expr<wpi::units::meter_t> y;

  operator wpi::math::Translation2d() {
    return wpi::math::Translation2d{x.unit(), y.unit()};
  }

#ifdef WITH_TRAJOPT
  operator trajopt::Translation2d() { return trajopt::Translation2d{x, y}; }
#endif
};

inline void to_json(wpi::util::json& json, const WheelLocation& module) {
  json = wpi::util::json::object("x", module.x, "y", module.y);
}

inline void from_json(const wpi::util::json& json, WheelLocation& module) {
  module.x = json.at("x").get<choreo::Expr<wpi::units::meter_t>>();
  module.y = json.at("y").get<choreo::Expr<wpi::units::meter_t>>();
}
}  // namespace choreo
