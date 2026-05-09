// Copyright (c) Choreo contributors

#include "choreo/trajectory/Trajectory.hpp"
#include "choreo/util/ArrayUtil.hpp"

#include <string>

#include "wpi/util/json.hpp"

void choreo::to_json(wpi::util::json& json,
                     const Trajectory<SwerveSample>& trajectory) {
  json = wpi::util::json{{"name", trajectory.name},
                   {"samples", trajectory.samples},
                   {"splits", trajectory.splits},
                   {"events", trajectory.events}};
}

void choreo::from_json(const wpi::util::json& json,
                       Trajectory<SwerveSample>& trajectory) {
  trajectory.name = json.at("name").get_string();
  trajectory.samples = 
      choreo::util::ParseObjectArray<SwerveSample>(json.at("trajectory").at("samples"));
  trajectory.splits =
      choreo::util::ParseIntArray(json.at("trajectory").at("splits"));
  // Add 0 as the first split index.
  if (trajectory.splits.size() == 0 || trajectory.splits.at(0) != 0) {
    trajectory.splits.insert(trajectory.splits.begin(), 0);
  }
  auto events = 
      choreo::util::ParseObjectArray<EventMarker>(json.at("events"));
  trajectory.events.clear();
  for (EventMarker event : events) {
    if (event.timestamp >= units::second_t{0} || event.event.size() == 0) {
      trajectory.events.push_back(event);
    }
  }
}

void choreo::to_json(wpi::util::json& json,
                     const Trajectory<DifferentialSample>& trajectory) {
  json = wpi::util::json{{"name", trajectory.name},
                   {"samples", trajectory.samples},
                   {"splits", trajectory.splits},
                   {"events", trajectory.events}};
}

void choreo::from_json(const wpi::util::json& json,
                       Trajectory<DifferentialSample>& trajectory) {
  trajectory.samples = 
      choreo::util::ParseObjectArray<DifferentialSample>(json.at("trajectory").at("samples"));
  trajectory.splits =
      choreo::util::ParseIntArray(json.at("trajectory").at("splits"));
  // Add 0 as the first split index.
  if (trajectory.splits.size() == 0 || trajectory.splits.at(0) != 0) {
    trajectory.splits.insert(trajectory.splits.begin(), 0);
  }
  auto events = 
      choreo::util::ParseObjectArray<EventMarker>(json.at("events"));
  trajectory.events.clear();
  for (EventMarker event : events) {
    if (event.timestamp >= units::second_t{0} || event.event.size() == 0) {
      trajectory.events.push_back(event);
    }
  }
}
