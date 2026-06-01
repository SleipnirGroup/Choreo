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
  Expr<dimensions::Length> tolerance = 0_m;
#ifdef WITH_TRAJOPT
  trajopt::KeepInLaneConstraint toTrajoptConstraint(
      const choreo::Waypoint& start,
      const std::optional<choreo::Waypoint&> end) const {
    return trajopt::LaneConstraint{start.toTrajoptPose2d().Translation(),
                                   end.toTrajoptPose2d().Translation,
                                   tolerance.value()};
  }
#endif

  ConstraintScope scope() const { return ConstraintScope::Both; }
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
