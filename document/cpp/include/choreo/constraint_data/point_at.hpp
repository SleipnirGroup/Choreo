// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/angle.hpp>
#include <wpi/units/length.hpp>
#include <wpi/util/json.hpp>

#include "../expr.hpp"
#include "../variables/dimension.hpp"

namespace choreo::ConstraintData {
struct PointAt {
  static PointAt fromJson(const wpi::util::json& json);
  Expr<dimensions::Length> x = 0_m;
  Expr<dimensions::Length> y = 0_m;
  Expr<dimensions::Angle> tolerance = 0_rad;
  Expr<dimensions::Angle> heading = 0_rad;
  bool flip = false;
};
inline void to_json(wpi::util::json& json, const PointAt& c) {
  json = wpi::util::json::object("x", c.x, "y", c.y, "tolerance", c.tolerance,
                                 "heading", c.heading, "flip", c.flip, "type",
                                 "PointAt");
}
inline void from_json(const wpi::util::json& json, PointAt& c) {
  c.x = json.at("x").get<Expr<dimensions::Length>>();
  c.y = json.at("y").get<Expr<dimensions::Length>>();
  c.tolerance = json.at("tolerance").get<Expr<dimensions::Angle>>();
  c.heading = json.at("heading").get<Expr<dimensions::Angle>>();
  c.flip = json.at("flip").get_bool();
}

inline PointAt PointAt::fromJson(const wpi::util::json& json) {
  PointAt value;
  from_json(json, value);
  return value;
}

}  // namespace choreo::ConstraintData
