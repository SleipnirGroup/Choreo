// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/length.hpp>
#include <wpi/util/json.hpp>
#include "../variables/dimension.hpp"

#include "../expr.hpp"

namespace choreo::ConstraintData {
struct KeepOutCircle {
  Expr<dimensions::Length> x = 0_m;
  Expr<dimensions::Length> y = 0_m;
  Expr<dimensions::Length> r = 0_m;
};
inline void to_json(wpi::util::json& json, const KeepOutCircle& c) {
  json = wpi::util::json::object("x", c.x, "y", c.y, "r", c.r, "type",
                                 "KeepOutCircle");
}
inline void from_json(const wpi::util::json& json, KeepOutCircle& c) {
  c.x = json.at("x").get<Expr<dimensions::Length>>();
  c.y = json.at("y").get<Expr<dimensions::Length>>();
  c.r = json.at("r").get<Expr<dimensions::Length>>();
}
}  // namespace choreo::ConstraintData
