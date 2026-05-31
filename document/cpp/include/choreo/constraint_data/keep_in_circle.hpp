// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/length.hpp>
#include <wpi/util/json.hpp>
#include <optional>
#include <string_view>
#include <variant>
#include <vector>
#include <trajopt/constraint/keep_out_region.hpp>
#include "../expr.hpp"
#include "constraint_scope.hpp"
#include <trajopt/constraint/keep_in_circle_constraint.hpp>
#include "../waypoint.hpp"
#include <trajopt/constraint/constraint.hpp>

namespace choreo { namespace ConstraintData {
struct KeepInCircle {
  Expr<wpi::units::meter_t> x = 0_m;
  Expr<wpi::units::meter_t> y = 0_m;
  Expr<wpi::units::meter_t> r = 0_m;


  trajopt::Constraint toTrajoptConstraint(const choreo::Waypoint& start, const std::optional<choreo::Waypoint>& end, const std::vector<trajopt::KeepOutRegion>& bumpers) const {
    return trajopt::KeepInCircleConstraint{bumpers, {x, y}, r};
  }

  choreo::ConstraintScope scope() const { return choreo::ConstraintScope::Both; }
  static std::string_view type_string() { return "KeepInCircle";}
};
inline void to_json(wpi::util::json& json, const KeepInCircle& c) {
  json = wpi::util::json::object("x", c.x, "y", c.y, "r", c.r, "type",
                                 c.type_string());
}
inline void from_json(const wpi::util::json& json, KeepInCircle& c) {
  c.x = json.at("x").get<Expr<wpi::units::meter_t>>();
  c.y = json.at("y").get<Expr<wpi::units::meter_t>>();
  c.r = json.at("r").get<Expr<wpi::units::meter_t>>();
}
}}  // namespace choreo::ConstraintData
