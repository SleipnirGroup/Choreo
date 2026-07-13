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
  Trajectory() = default;
  Trajectory(const Trajectory&) = default;
  Trajectory(std::vector<wpi::units::second_t> waypoints,
             typename Type::WPILibTrajectory samples,
             std::vector<std::size_t> splits)
      : waypoints(std::move(waypoints)),
        samples(std::move(samples)),
        splits(std::move(splits)) {}
  // The times at which the robot will reach each waypoint.
  std::vector<wpi::units::second_t> waypoints;
  typename Type::WPILibTrajectory samples;
  // The indices into the samples vector where each segment starts.
  std::vector<std::size_t> splits;
  static inline Trajectory<Type> realDefault() {
    return Trajectory<Type>{{}, typename Type::WPILibTrajectory{std::vector<typename Type::WPILibSample>{}}, {}};
  }
static inline Trajectory<Type> from_json(const wpi::util::json& json) {
  std::string s = json.at("sample_type").get_string();
  if (s != Type::tag) {
    throw std::invalid_argument("Parsing Trajectory with wrong drive type" + s);
  }

  auto sampleVec =
      json.at("samples").at("samples").get<std::vector<typename Type::WPILibSample>>();
  auto samples = typename Type::WPILibTrajectory{std::move(sampleVec)};

  auto waypoints = json.at("waypoints").get_array() |
                   std::views::transform([](const wpi::util::json& x) {
                     return static_cast<wpi::units::second_t>(x.get_number());
                   }) |
                   std::ranges::to<std::vector<wpi::units::second_t>>();
  auto splits = json.at("splits").get_array() |
                std::views::transform([](const wpi::util::json& x) {
                  return static_cast<std::size_t>(x.get_number());
                }) |
                std::ranges::to<std::vector<std::size_t>>();
  return Trajectory<Type>{waypoints, samples, splits};
}
};
template <typename Type>
requires DriveTypeLike<Type>
inline void to_json(wpi::util::json& json, const Trajectory<Type>& traj) {
  auto waypoints = traj.waypoints |
                   std::views::transform([](wpi::units::second_t t) {
                     return t.value();
                   }) |
                   std::ranges::to<std::vector<double>>();
  json = wpi::util::json::object(
      "waypoints", waypoints, "splits", traj.splits);
  json["samples"] = traj.samples;
  json["sample_type"] = Type::tag;
}


}  // namespace choreo
