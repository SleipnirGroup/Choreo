// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <cstddef>
#include <optional>
#include <ranges>
#include <variant>
#include <vector>

#include <wpi/util/json.hpp>

#include "choreo/drive_type.hpp"
#include "choreo/trajectory/swerve_sample.hpp"
#include "choreo/trajectory/differential_sample.hpp"
#include "choreo/robot_config.hpp"
#include "choreo/trajectory/sample_concept.hpp"
#include "sample_concept.hpp"

namespace choreo {

template <typename Type>
requires DriveTypeLike<Type>
struct Trajectory {
  std::optional<RobotConfig> config;
  std::vector<double> waypoints;
  typename Type::WPILibTrajectory samples;
  std::vector<std::size_t> splits;
static inline Trajectory<Type> from_json(const wpi::util::json& json) {
  auto config = json.contains("config")
                    ? std::make_optional(json.at("config").get<RobotConfig>())
                    : std::nullopt;
  std::string s = json.at("sample_type").get_string();
  if (s != Type::tag) {
    throw std::invalid_argument("Parsing Trajectory with wrong drive type" + s);
  }

  auto samples = typename Type::WPILibTrajectory{std::vector<typename Type::WPILibSample>{}};


  auto waypoints = json.at("waypoints").get_array() |
                   std::views::transform([](const wpi::util::json& x) {
                     return x.get_number();
                   }) |
                   std::ranges::to<std::vector<double>>();
  auto splits = json.at("splits").get_array() |
                std::views::transform([](const wpi::util::json& x) {
                  return static_cast<std::size_t>(x.get_number());
                }) |
                std::ranges::to<std::vector<std::size_t>>();
  return Trajectory<Type>{config, waypoints, samples, splits};
}
};
template <typename Type>
requires DriveTypeLike<Type>
inline void to_json(wpi::util::json& json, const Trajectory<Type>& traj) {
  const wpi::util::json config_json =
      traj.config ? wpi::util::json(*traj.config) : wpi::util::json();
  
  json = wpi::util::json::object(
      "config", config_json, "waypoints",
      traj.waypoints, "splits", traj.splits);
  json["samples"] = traj.samples;
  json["sample_type"] = Type::tag;
}


}  // namespace choreo
