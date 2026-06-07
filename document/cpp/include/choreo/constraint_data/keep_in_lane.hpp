// Copyright (c) Choreo contributors

#pragma once
#include <trajopt/constraints/lane_constraint.hpp>
#include <wpi/units/length.hpp>
#include <wpi/util/json.hpp>

#include "../expr.hpp"
#include "../variables/dimension.hpp"
#include "./constraint_scope.hpp"

namespace choreo::ConstraintData {
struct KeepInLane {
  static KeepInLane fromJson(const wpi::util::json& json);
  Expr<dimensions::Length> x1 = 0_m;
  Expr<dimensions::Length> y1 = 0_m;
  bool useStartPoint = true;
  Expr<dimensions::Length> x2 = 0_m;
  Expr<dimensions::Length> y2 = 0_m;
  bool useEndPoint = true;
  Expr<dimensions::Length> tolerance = 0_m;

  trajopt::Constraint toTrajoptConstraint(
) const {
    return trajopt::LaneConstraint{{x1.unit(), y1.unit()}, {x2.unit(), y2.unit()},
                                   tolerance.value()};
  }

  KeepInLane forEndpoints(const choreo::Waypoint& start,
                             const choreo::Waypoint& end) const {
    KeepInLane c = *this;
    if (useStartPoint) {
      c.x1 = start.pose.x;
      c.y1 = start.pose.y;
    }
    if (useEndPoint) {
      c.x2 = end.pose.x;
      c.y2 = end.pose.y;
    }
    return c;
  }

   choreo::ConstraintScope scope() const { return choreo::ConstraintScope::Both; }
};
inline void to_json(wpi::util::json& json, const KeepInLane& c) {
  json =
      wpi::util::json::object("tolerance", c.tolerance, "type", "KeepInLane");
}
inline void from_json(const wpi::util::json& json, KeepInLane& c) {
  c.tolerance = json.at("tolerance").get<Expr<dimensions::Length>>();
}

inline KeepInLane KeepInLane::fromJson(const wpi::util::json& json) {
  KeepInLane value;
  from_json(json, value);
  return value;
}

}  // namespace choreo::ConstraintData
