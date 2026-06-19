// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/velocity.hpp>

// Common to all constraints
#include <optional>
#include <string_view>
#include <variant>
#include <vector>

#include <trajopt/constraint/constraint.hpp>
#include <trajopt/constraint/keep_out_region.hpp>
#include <trajopt/constraint/linear_velocity_max_magnitude_constraint.hpp>
#include <wpi/util/json.hpp>

#include "../expr.hpp"
#include "../variables/dimension.hpp"
#include "../waypoint.hpp"
#include "constraint_scope.hpp"

namespace choreo::ConstraintData {
struct MaxVelocity {
  static MaxVelocity fromJson(const wpi::util::json& json);
  Expr<dimensions::LinVel> max = 0_mps;

  trajopt::Constraint toTrajoptConstraint(
    const std::vector<trajopt::KeepOutRegion>& bumpers) const {
    return trajopt::LinearVelocityMaxMagnitudeConstraint{max};
  }

  choreo::ConstraintScope scope() const {
    return choreo::ConstraintScope::Both;
  }
  static std::string_view type_string() { return "MaxVelocity"; }
  MaxVelocity forEndpoints(const choreo::Waypoint& start,
                             const choreo::Waypoint& end) const {
    // For a max-velocity constraint, the endpoints don't affect the constraint
    // itself, so we can just return *this. However, we need to return a new
    // instance to satisfy the interface.
    return *this;
  }
};
inline void to_json(wpi::util::json& json, const MaxVelocity& c) {
  json = wpi::util::json::object("max", c.max, "type", c.type_string());
}
inline void from_json(const wpi::util::json& json, MaxVelocity& c) {
  c.max = json.at("max").get<Expr<dimensions::LinVel>>();
}

inline MaxVelocity MaxVelocity::fromJson(const wpi::util::json& json) {
  MaxVelocity value;
  from_json(json, value);
  return value;
}

}  // namespace choreo::ConstraintData
