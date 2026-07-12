// Copyright (c) Choreo contributors

#pragma once
#include <algorithm>
#include <ranges>
#include <vector>

#include <wpi/units/time.hpp>
#include <wpi/util/json.hpp>

#include "constraint.hpp"
#include "expr.hpp"
#include "variables/dimension.hpp"
#include "waypoint.hpp"
namespace choreo {
struct Parameters {
  static Parameters fromJson(const wpi::util::json& json);
  std::vector<Waypoint> waypoints;
  std::vector<Constraint> constraints;
  Expr<dimensions::Time> target_dt;

  bool equivalent(const Parameters& other) const {
    if (!target_dt.equivalent(other.target_dt)) {
      return false;
    }
    if (waypoints.size() != other.waypoints.size() ||
        constraints.size() != other.constraints.size()) {
      return false;
    }
    const bool waypointsEqual =
        std::ranges::equal(waypoints, other.waypoints,
                           [](const Waypoint& lhs, const Waypoint& rhs) {
                             return lhs.equivalent(rhs);
                           });
    if (!waypointsEqual) {
      return false;
    }
    return std::ranges::equal(
        constraints, other.constraints,
        [](const Constraint& lhs, const Constraint& rhs) {
          return lhs.equivalent(rhs);
        });
  }
};
inline void to_json(wpi::util::json& json, const Parameters& params) {
  json = wpi::util::json::object("waypoints", params.waypoints, "constraints",
                                 params.constraints, "target_dt",
                                 params.target_dt);
}
inline void from_json(const wpi::util::json& json, Parameters& params) {
  params.waypoints = json.at("waypoints").get_array() |
                     std::views::transform([](const wpi::util::json& wpJson) {
                       return wpJson.get<Waypoint>();
                     }) |
                     std::ranges::to<std::vector<Waypoint>>();
  params.constraints =
      json.at("constraints").get_array() |
      std::views::transform([](const wpi::util::json& constraintJson) {
        return constraintJson.get<Constraint>();
      }) |
      std::ranges::to<std::vector<Constraint>>();
  params.target_dt = json.at("target_dt").get<Expr<dimensions::Time>>();
}

inline Parameters Parameters::fromJson(const wpi::util::json& json) {
  Parameters value;
  from_json(json, value);
  return value;
}

}  // namespace choreo
