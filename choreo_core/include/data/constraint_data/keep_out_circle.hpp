#pragma once
#include "data/expr.hpp"
#include <wpi/util/json.hpp>
#include <wpi/units/length.hpp>

namespace choreo::ConstraintData {
struct KeepOutCircle {
  Expr<wpi::units::meter_t> x = 0_m;
  Expr<wpi::units::meter_t> y = 0_m;
  Expr<wpi::units::meter_t> r = 0_m;
};
inline void to_json(wpi::util::json& json, const KeepOutCircle& c) {
  json = wpi::util::json::object("x", c.x, "y", c.y, "r", c.r, "type", "KeepOutCircle");
}
inline void from_json(const wpi::util::json& json, KeepOutCircle& c) {
  c.x = json.at("x").get<Expr<wpi::units::meter_t>>();
  c.y = json.at("y").get<Expr<wpi::units::meter_t>>();
  c.r = json.at("r").get<Expr<wpi::units::meter_t>>();
}
} // namespace choreo::ConstraintData