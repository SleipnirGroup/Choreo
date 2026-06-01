// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/length.hpp>
#include <wpi/util/json.hpp>

#include "../variables/dimension.hpp"
#include "../expr.hpp"

namespace choreo::ConstraintData {
struct KeepInRectangle {
  Expr<dimensions::Length> x = 0_m;
  Expr<dimensions::Length> y = 0_m;
  Expr<dimensions::Length> w = 0_m;
  Expr<dimensions::Length> h = 0_m;
};
inline void to_json(wpi::util::json& json, const KeepInRectangle& c) {
  json = wpi::util::json::object("x", c.x, "y", c.y, "w", c.w, "h", c.h, "type",
                                 "KeepInRectangle");
}
inline void from_json(const wpi::util::json& json, KeepInRectangle& c) {
  c.x = json.at("x").get<Expr<dimensions::Length>>();
  c.y = json.at("y").get<Expr<dimensions::Length>>();
  c.w = json.at("w").get<Expr<dimensions::Length>>();
  c.h = json.at("h").get<Expr<dimensions::Length>>();
}
}  // namespace choreo::ConstraintData
