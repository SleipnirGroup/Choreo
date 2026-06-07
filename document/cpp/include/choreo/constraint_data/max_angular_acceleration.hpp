// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/angular_acceleration.hpp>
#include <wpi/util/json.hpp>

#include "../expr.hpp"
#include "../variables/dimension.hpp"

namespace choreo::ConstraintData {
struct MaxAngularAcceleration {
  static MaxAngularAcceleration fromJson(const wpi::util::json& json);
  Expr<dimensions::AngAcc> max = 0_rad_per_s_sq;
};
inline void to_json(wpi::util::json& json, const MaxAngularAcceleration& c) {
  json =
      wpi::util::json::object("max", c.max, "type", "MaxAngularAcceleration");
}
inline void from_json(const wpi::util::json& json, MaxAngularAcceleration& c) {
  c.max = json.at("max").get<Expr<dimensions::AngAcc>>();
}

inline MaxAngularAcceleration MaxAngularAcceleration::fromJson(
    const wpi::util::json& json) {
  MaxAngularAcceleration value;
  from_json(json, value);
  return value;
}

}  // namespace choreo::ConstraintData
