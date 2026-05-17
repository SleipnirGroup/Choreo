// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/velocity.hpp>
#include <wpi/util/json.hpp>

#include "data/expr.hpp"

namespace choreo::ConstraintData {
struct MaxVelocity {
  Expr<wpi::units::meters_per_second_t> max = 0_mps;
};
inline void to_json(wpi::util::json& json, const MaxVelocity& c) {
  json = wpi::util::json::object("max", c.max, "type", "MaxVelocity");
}
inline void from_json(const wpi::util::json& json, MaxVelocity& c) {
  c.max = json.at("max").get<Expr<wpi::units::meters_per_second_t>>();
}
}  // namespace choreo::ConstraintData
