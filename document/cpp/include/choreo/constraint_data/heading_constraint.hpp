// Copyright (c) Choreo contributors

#pragma once
#include <wpi/units/angle.hpp>
#include <wpi/util/json.hpp>
#include <string_view>

#include "../expr.hpp"
#include "./constraint_scope.hpp"

namespace choreo::ConstraintData {
using namespace wpi::units::literals;
struct HeadingConstraint {
  Expr<wpi::units::radian_t> heading = 0_rad;
  Expr<wpi::units::radian_t> tolerance = 0_rad;

  // #ifdef WITH_TRAJOPT
  // trajopt::HeadingConstraint toTrajoptConstraint(const choreo::Waypoint& start, const std::optional<choreo::Waypoint&> end) const {
  //   return trajopt::HeadingConstraint{heading, tolerance};
  // }
  // #endif

  ConstraintScope scope() const { return ConstraintScope::Both; }
  static std::string_view type_string() { return "Heading";}
};
inline void to_json(wpi::util::json& json, const HeadingConstraint& c) {
  json = wpi::util::json::object("heading", c.heading, "tolerance", c.tolerance,
                                 "type", HeadingConstraint::type_string());
}
inline void from_json(const wpi::util::json& json, HeadingConstraint& c) {
  c.heading = json.at("heading").get<Expr<wpi::units::radian_t>>();
  c.tolerance = json.at("tolerance").get<Expr<wpi::units::radian_t>>();
}
}  // namespace choreo::ConstraintData
