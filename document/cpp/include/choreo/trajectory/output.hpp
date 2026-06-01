// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <cstddef>
#include <optional>
#include <ranges>
#include <vector>

#include <wpi/util/json.hpp>

#include "choreo/drive_type.hpp"
#include "choreo/robot_config.hpp"
#include "sample_variant.hpp"

namespace choreo {

struct Trajectory {
  std::optional<RobotConfig> config;
  std::optional<DriveType> sample_type;
  std::vector<double> waypoints;
  SampleListVariant samples;
  std::vector<std::size_t> splits;
  static Trajectory fromJson(const wpi::util::json& json);
};

inline void to_json(wpi::util::json& json, const Trajectory& traj) {
  const wpi::util::json config_json =
      traj.config ? wpi::util::json(*traj.config) : wpi::util::json();
  const wpi::util::json sample_type_json =
      traj.sample_type ? wpi::util::json(*traj.sample_type) : wpi::util::json();
  json = wpi::util::json::object(
      "config", config_json, "sample_type", sample_type_json, "waypoints",
      traj.waypoints, "samples", traj.samples, "splits", traj.splits);
}

inline void from_json(const wpi::util::json& json, Trajectory& traj) {
  traj.config = json.contains("config")
                    ? std::make_optional(json.at("config").get<RobotConfig>())
                    : std::nullopt;
  traj.sample_type =
      json.contains("sample_type")
          ? std::make_optional(json.at("sample_type").get<DriveType>())
          : std::nullopt;
  traj.waypoints = json.at("waypoints").get_array() |
                   std::views::transform([](const wpi::util::json& x) {
                     return x.get_number();
                   }) |
                   std::ranges::to<std::vector<double>>();
  traj.samples = json.at("samples").get<SampleListVariant>();
  traj.splits = json.at("splits").get_array() |
                std::views::transform([](const wpi::util::json& x) {
                  return static_cast<std::size_t>(x.get_number());
                }) |
                std::ranges::to<std::vector<std::size_t>>();
}

inline Trajectory Trajectory::fromJson(const wpi::util::json& json) {
  Trajectory traj;
  from_json(json, traj);
  return traj;
}
}  // namespace choreo
