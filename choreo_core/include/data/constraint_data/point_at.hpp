#pragma once
#include "data/expr.hpp"
#include <wpi/util/json.hpp>
#include <wpi/units/length.hpp>
#include <wpi/units/angle.hpp>

namespace choreo::ConstraintData {
struct PointAt {
  Expr<wpi::units::meter_t> x = 0_m;
  Expr<wpi::units::meter_t> y = 0_m;
  Expr<wpi::units::radian_t> tolerance = 0_rad;
  bool flip = false;
};
inline void to_json(wpi::util::json& json, const PointAt& c) {
  json = wpi::util::json::object(
    "x", c.x,
    "y", c.y,
    "tolerance", c.tolerance,
    "flip", c.flip,
    "type", "PointAt"
  );
}
inline void from_json(const wpi::util::json& json, PointAt& c) {
  c.x = json.at("x").get<Expr<wpi::units::meter_t>>();
  c.y = json.at("y").get<Expr<wpi::units::meter_t>>();
  c.tolerance = json.at("tolerance").get<Expr<wpi::units::radian_t>>();
  c.flip = json.at("flip").get_bool();
}
} // namespace choreo::ConstraintData