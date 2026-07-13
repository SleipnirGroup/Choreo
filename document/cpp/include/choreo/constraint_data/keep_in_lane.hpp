// Copyright (c) Choreo contributors

#pragma once
#ifdef CHOREO_WITH_TRAJOPT
#include <trajopt/constraints/lane_constraint.hpp>
#endif
#include <wpi/units/length.hpp>
#include <wpi/util/json.hpp>

#include "../expr.hpp"
#include "../variables/dimension.hpp"
#include "../waypoint.hpp"
#include "./constraint_scope.hpp"

namespace choreo::ConstraintData {
struct KeepInLane {
  KeepInLane() = default;
  KeepInLane(const KeepInLane&) = default;
  static KeepInLane fromJson(const wpi::util::json& json);
  Expr<dimensions::Length> x1 = 0_m;
  Expr<dimensions::Length> y1 = 0_m;
  bool useStartPoint = true;
  Expr<dimensions::Length> x2 = 0_m;
  Expr<dimensions::Length> y2 = 0_m;
  bool useEndPoint = true;
  Expr<dimensions::Length> tolerance = 0_m;

#ifdef CHOREO_WITH_TRAJOPT
  trajopt::Constraint toTrajoptConstraint(
) const {
    return trajopt::LaneConstraint{{x1.unit(), y1.unit()}, {x2.unit(), y2.unit()},
                                   tolerance.value()};
  }
#endif

  KeepInLane forEndpoints(const choreo::Waypoint& start,
                             const choreo::Waypoint& end) const {
    KeepInLane c = *this;
    if (useStartPoint) {
      c.x1 = start.x;
      c.y1 = start.y;
    }
    if (useEndPoint) {
      c.x2 = end.x;
      c.y2 = end.y;
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
