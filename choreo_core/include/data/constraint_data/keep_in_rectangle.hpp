#pragma once
#include "data/expr.hpp"
#include <wpi/util/json.hpp>
#include <wpi/units/length.hpp>

namespace choreo::ConstraintData {
struct KeepInRectangle {
  Expr<wpi::units::meter_t> x = 0_m;
  Expr<wpi::units::meter_t> y = 0_m;
  Expr<wpi::units::meter_t> w = 0_m;
  Expr<wpi::units::meter_t> h = 0_m;
};
inline void to_json(wpi::util::json& json, const KeepInRectangle& c) {
  json = wpi::util::json::object("x", c.x, "y", c.y, "w", c.w, "h", c.h, "type", "KeepInRectangle");
}
inline void from_json(const wpi::util::json& json, KeepInRectangle& c) {
  c.x = json.at("x").get<Expr<wpi::units::meter_t>>();
  c.y = json.at("y").get<Expr<wpi::units::meter_t>>();
  c.w = json.at("w").get<Expr<wpi::units::meter_t>>();
  c.h = json.at("h").get<Expr<wpi::units::meter_t>>();
}
} // namespace choreo::ConstraintData