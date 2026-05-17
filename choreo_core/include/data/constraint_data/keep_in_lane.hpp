// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/length.hpp>
#include <wpi/util/json.hpp>

#include "data/expr.hpp"

namespace choreo::ConstraintData {
struct KeepInLane {
  Expr<wpi::units::meter_t> tolerance = 0_m;
};
inline void to_json(wpi::util::json& json, const KeepInLane& c) {
  json =
      wpi::util::json::object("tolerance", c.tolerance, "type", "KeepInLane");
}
inline void from_json(const wpi::util::json& json, KeepInLane& c) {
  c.tolerance = json.at("tolerance").get<Expr<wpi::units::meter_t>>();
}
}  // namespace choreo::ConstraintData
