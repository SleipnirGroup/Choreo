// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/velocity.hpp>

// Common to all constraints
#include <wpi/util/json.hpp>
#include <optional>
#include <string_view>
#include <variant>
#include <vector>
#include <trajopt/constraint/keep_out_region.hpp>
#include "../expr.hpp"
#include "constraint_scope.hpp"
#include "../waypoint.hpp"
#include <trajopt/constraint/constraint.hpp>

#include <trajopt/constraint/linear_velocity_max_magnitude_constraint.hpp>

namespace choreo::ConstraintData {
struct MaxVelocity {
  Expr<wpi::units::meters_per_second_t> max = 0_mps;

  trajopt::Constraint toTrajoptConstraint(const choreo::Waypoint& start, const std::optional<choreo::Waypoint>& end, const std::vector<trajopt::KeepOutRegion>& bumpers) const {
    return trajopt::LinearVelocityMaxMagnitudeConstraint{max};
  }

  choreo::ConstraintScope scope() const { return choreo::ConstraintScope::Both; }
  static std::string_view type_string() { return "MaxVelocity";}
};
inline void to_json(wpi::util::json& json, const MaxVelocity& c) {
  json = wpi::util::json::object("max", c.max, "type", c.type_string());
}
inline void from_json(const wpi::util::json& json, MaxVelocity& c) {
  c.max = json.at("max").get<Expr<wpi::units::meters_per_second_t>>();
}
}  // namespace choreo::ConstraintData
