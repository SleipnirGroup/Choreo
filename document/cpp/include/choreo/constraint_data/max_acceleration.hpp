// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/acceleration.hpp>
#include <wpi/util/json.hpp>

#include "../expr.hpp"

namespace choreo::ConstraintData {
struct MaxAcceleration {
  Expr<wpi::units::meters_per_second_squared_t> max = 0_mps_sq;
};
inline void to_json(wpi::util::json& json, const MaxAcceleration& c) {
  json = wpi::util::json::object("max", c.max, "type", "MaxAcceleration");
}
inline void from_json(const wpi::util::json& json, MaxAcceleration& c) {
  c.max = json.at("max").get<Expr<wpi::units::meters_per_second_squared_t>>();
}
}  // namespace choreo::ConstraintData
