#pragma once
#include "data/expr.hpp"
#include <wpi/util/json.hpp>
#include <wpi/units/angular_acceleration.hpp>

namespace choreo::ConstraintData {
struct MaxAngularAcceleration {
  Expr<wpi::units::radians_per_second_squared_t> max = 0_rad_per_s_sq;
};
inline void to_json(wpi::util::json& json, const MaxAngularAcceleration& c) {
  json = wpi::util::json::object("max", c.max, "type", "MaxAngularAcceleration");
}
inline void from_json(const wpi::util::json& json, MaxAngularAcceleration& c) {
  c.max = json.at("max").get<Expr<wpi::units::radians_per_second_squared_t>>();
}
} // namespace choreo::ConstraintData