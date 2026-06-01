// Copyright (c) Choreo contributors

#pragma once
#include <optional>
#include <string_view>
#include <variant>
#include <vector>

#include <trajopt/constraint/angular_velocity_max_magnitude_constraint.hpp>
#include <trajopt/constraint/constraint.hpp>
#include <trajopt/constraint/keep_out_region.hpp>
#include <wpi/units/angular_velocity.hpp>
#include <wpi/util/json.hpp>

#include "../expr.hpp"
#include "../variables/dimension.hpp"
#include "../waypoint.hpp"
#include "constraint_scope.hpp"

namespace choreo::ConstraintData {
struct MaxAngularVelocity {
  static MaxAngularVelocity fromJson(const wpi::util::json& json);
  Expr<dimensions::AngVel> max = 0_rad_per_s;

  trajopt::Constraint toTrajoptConstraint(
      const std::vector<trajopt::KeepOutRegion>& bumpers) const {
    return trajopt::AngularVelocityMaxMagnitudeConstraint{max};
  }

  choreo::ConstraintScope scope() const {
    return choreo::ConstraintScope::Both;
  }
  static std::string_view type_string() { return "MaxAngularVelocity"; }
  MaxAngularVelocity forEndpoints(const choreo::Waypoint& start,
                             const choreo::Waypoint& end) const {
    // For a max-angular-velocity constraint, the endpoints don't affect the constraint
    // itself, so we can just return *this. However, we need to return a new
    // instance to satisfy the interface.
    return *this;
  }
};
inline void to_json(wpi::util::json& json, const MaxAngularVelocity& c) {
  json = wpi::util::json::object("max", c.max, "type", "MaxAngularVelocity");
}
inline void from_json(const wpi::util::json& json, MaxAngularVelocity& c) {
  c.max = json.at("max").get<Expr<dimensions::AngVel>>();
}

inline MaxAngularVelocity MaxAngularVelocity::fromJson(
    const wpi::util::json& json) {
  MaxAngularVelocity value;
  from_json(json, value);
  return value;
}

}  // namespace choreo::ConstraintData
