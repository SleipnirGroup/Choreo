// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/angular_velocity.hpp>
#include <wpi/util/json.hpp>

#include "../expr.hpp"

namespace choreo::ConstraintData {
struct MaxAngularVelocity {
  Expr<wpi::units::radians_per_second_t> max = 0_rad_per_s;
};
inline void to_json(wpi::util::json& json, const MaxAngularVelocity& c) {
  json = wpi::util::json::object("max", c.max, "type", "MaxAngularVelocity");
}
inline void from_json(const wpi::util::json& json, MaxAngularVelocity& c) {
  c.max = json.at("max").get<Expr<wpi::units::radians_per_second_t>>();
}
}  // namespace choreo::ConstraintData
