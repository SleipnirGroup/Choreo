// Copyright (c) Choreo contributors

#include "choreo/trajectory/Trajectory.hpp"

#include <string>

#include <wpi/util/json.hpp>

void choreo::to_json(wpi::util::json& json,
                     const Trajectory<SwerveSample>& trajectory) {
  json = wpi::util::json::object("name", trajectory.name, "samples",
                                 trajectory.samples, "splits",
                                 trajectory.splits, "events", trajectory.events);
}

void choreo::from_json(const wpi::util::json& json,
                       Trajectory<SwerveSample>& trajectory) {
  trajectory.name = json.at("name").get_string();
  trajectory.samples.clear();
  for (const auto& sampleJson : json.at("trajectory").at("samples").get_array()) {
    trajectory.samples.push_back(sampleJson.get<SwerveSample>());
  }

  trajectory.splits.clear();
  for (const auto& splitJson : json.at("trajectory").at("splits").get_array()) {
    trajectory.splits.push_back(static_cast<int>(splitJson.get_int()));
  }
  // Add 0 as the first split index.
  if (trajectory.splits.size() == 0 || trajectory.splits.at(0) != 0) {
    trajectory.splits.insert(trajectory.splits.begin(), 0);
  }
  trajectory.events.clear();
  for (const auto& eventJson : json.at("events").get_array()) {
    auto event = eventJson.get<EventMarker>();
    if (event.timestamp >= wpi::units::second_t{0} || event.event.size() == 0) {
      trajectory.events.push_back(event);
    }
  }
}

void choreo::to_json(wpi::util::json& json,
                     const Trajectory<DifferentialSample>& trajectory) {
  json = wpi::util::json::object("name", trajectory.name, "samples",
                                 trajectory.samples, "splits",
                                 trajectory.splits, "events", trajectory.events);
}

void choreo::from_json(const wpi::util::json& json,
                       Trajectory<DifferentialSample>& trajectory) {
  trajectory.samples.clear();
  for (const auto& sampleJson : json.at("trajectory").at("samples").get_array()) {
    trajectory.samples.push_back(sampleJson.get<DifferentialSample>());
  }

  trajectory.splits.clear();
  for (const auto& splitJson : json.at("trajectory").at("splits").get_array()) {
    trajectory.splits.push_back(static_cast<int>(splitJson.get_int()));
  }
  // Add 0 as the first split index.
  if (trajectory.splits.size() == 0 || trajectory.splits.at(0) != 0) {
    trajectory.splits.insert(trajectory.splits.begin(), 0);
  }
  trajectory.events.clear();
  for (const auto& eventJson : json.at("events").get_array()) {
    auto event = eventJson.get<EventMarker>();
    if (event.timestamp >= wpi::units::second_t{0} || event.event.size() == 0) {
      trajectory.events.push_back(event);
    }
  }
}
