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
