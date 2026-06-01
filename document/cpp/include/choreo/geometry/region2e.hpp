// Copyright (c) Choreo contributors

#pragma once

#include <wpi/math/geometry/Ellipse2d.hpp>
#include <wpi/math/geometry/Rectangle2d.hpp>
#include <wpi/units/angle.hpp>
#include <wpi/units/length.hpp>
#include <wpi/util/json.hpp>

#include "../expr.hpp"
#include "../variables/dimension.hpp"
#include "pose2e.hpp"
#include "type_traits"

namespace choreo {
/// Represents a rotated region parameterized by its center, dimensions, and
/// heading. This can represent a rect or an ellipse
struct Region2e {
  static Region2e fromJson(const wpi::util::json& json);
  Expr<dimensions::Length> x;
  Expr<dimensions::Length> y;
  Expr<dimensions::Angle> heading;
  Expr<dimensions::Length> w;
  Expr<dimensions::Length> h;

  operator wpi::math::Ellipse2d() const {
    return wpi::math::Ellipse2d{
        wpi::math::Pose2d{x.unit(), y.unit(), {heading.unit()}}, w.unit() / 2.0,
        h.unit() / 2.0};
  }

  operator wpi::math::Rectangle2d() const {
    return wpi::math::Rectangle2d{
        wpi::math::Pose2d{x.unit(), y.unit(), {heading.unit()}}, w.unit(),
        h.unit()};
  }
};

inline void to_json(wpi::util::json& json, Region2e const& ellipse) {
  json =
      wpi::util::json::object("x", ellipse.x, "y", ellipse.y, "heading",
                              ellipse.heading, "w", ellipse.w, "h", ellipse.h);
}

inline void from_json(wpi::util::json const& json, Region2e& ellipse) {
  ellipse.x = json.at("x").get<choreo::Expr<dimensions::Length>>();
  ellipse.y = json.at("y").get<choreo::Expr<dimensions::Length>>();
  ellipse.heading = json.at("heading").get<choreo::Expr<dimensions::Angle>>();
  ellipse.w = json.at("w").get<choreo::Expr<dimensions::Length>>();
  ellipse.h = json.at("h").get<choreo::Expr<dimensions::Length>>();
}

inline Region2e Region2e::fromJson(const wpi::util::json& json) {
  Region2e value;
  from_json(json, value);
  return value;
}

}  // namespace choreo
