// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/angular_acceleration.hpp>
#include <wpi/util/json.hpp>

#include "../variables/dimension.hpp"
#include "../expr.hpp"

namespace choreo::ConstraintData {
struct MaxAngularAcceleration {
  Expr<dimensions::AngAcc> max = 0_rad_per_s_sq;
};
inline void to_json(wpi::util::json& json, const MaxAngularAcceleration& c) {
  json =
      wpi::util::json::object("max", c.max, "type", "MaxAngularAcceleration");
}
inline void from_json(const wpi::util::json& json, MaxAngularAcceleration& c) {
  c.max = json.at("max").get<Expr<dimensions::AngAcc>>();
}
}  // namespace choreo::ConstraintData
