// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/angular_velocity.hpp>
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

#include <trajopt/constraint/angular_velocity_max_magnitude_constraint.hpp>

namespace choreo::ConstraintData {
struct MaxAngularVelocity {
  Expr<wpi::units::radians_per_second_t> max = 0_rad_per_s;

  trajopt::Constraint toTrajoptConstraint(const choreo::Waypoint& start, const std::optional<choreo::Waypoint>& end, const std::vector<trajopt::KeepOutRegion>& bumpers) const {
    return trajopt::AngularVelocityMaxMagnitudeConstraint{max};
  }

  choreo::ConstraintScope scope() const { return choreo::ConstraintScope::Both; }
  static std::string_view type_string() { return "MaxAngularVelocity";}
};
inline void to_json(wpi::util::json& json, const MaxAngularVelocity& c) {
  json = wpi::util::json::object("max", c.max, "type", "MaxAngularVelocity");
}
inline void from_json(const wpi::util::json& json, MaxAngularVelocity& c) {
  c.max = json.at("max").get<Expr<wpi::units::radians_per_second_t>>();
}
}  // namespace choreo::ConstraintData
