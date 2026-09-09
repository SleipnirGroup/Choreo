// Copyright (c) Choreo contributors

#include "choreo/trajectory/Trajectory.hpp"

#include <string>

#include <wpi/json.h>

void choreo::to_json(wpi::json& json,
                     const Trajectory<SwerveSample>& trajectory) {
  json = wpi::json{{"name", trajectory.name},
                   {"samples", trajectory.samples},
                   {"splits", trajectory.splits},
                   {"events", trajectory.events}};
}

void choreo::from_json(const wpi::json& json,
                       Trajectory<SwerveSample>& trajectory) {
  trajectory.name = json.at("name").get<std::string>();
  trajectory.samples =
      json.at("trajectory").at("samples").get<std::vector<SwerveSample>>();
  trajectory.splits =
      json.at("trajectory").at("splits").get<std::vector<int>>();
  // Add 0 as the first split index.
  if (trajectory.splits.size() == 0 || trajectory.splits.at(0) != 0) {
    trajectory.splits.insert(trajectory.splits.begin(), 0);
  }
  auto events = json.at("events").get<std::vector<EventMarker>>();
  trajectory.events.clear();
  for (EventMarker event : events) {
    if (event.timestamp >= units::second_t{0} || event.event.size() == 0) {
      trajectory.events.push_back(event);
    }
  }
}

void choreo::to_json(wpi::json& json,
                     const Trajectory<DifferentialSample>& trajectory) {
  json = wpi::json{{"name", trajectory.name},
                   {"samples", trajectory.samples},
                   {"splits", trajectory.splits},
                   {"events", trajectory.events}};
}

void choreo::from_json(const wpi::json& json,
                       Trajectory<DifferentialSample>& trajectory) {
  trajectory.samples = json.at("trajectory")
                           .at("samples")
                           .get<std::vector<DifferentialSample>>();
  trajectory.splits =
      json.at("trajectory").at("splits").get<std::vector<int>>();
  // Add 0 as the first split index.
  if (trajectory.splits.size() == 0 || trajectory.splits.at(0) != 0) {
    trajectory.splits.insert(trajectory.splits.begin(), 0);
  }
  auto events = json.at("events").get<std::vector<EventMarker>>();
  trajectory.events.clear();
  for (EventMarker event : events) {
    if (event.timestamp >= units::second_t{0} || event.event.size() == 0) {
      trajectory.events.push_back(event);
    }
  }
}
