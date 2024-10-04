// Copyright (c) Choreo contributors

#include "choreo/trajectory/Trajectory.h"

#include <string>

#include <wpi/json.h>

using namespace choreo;

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
  trajectory.events = json.at("events").get<std::vector<EventMarker>>();
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
  trajectory.samples =
      json.at("traj").at("samples").get<std::vector<DifferentialSample>>();
  trajectory.splits =
      json.at("trajectory").at("splits").get<std::vector<int>>();
  trajectory.events = json.at("events").get<std::vector<EventMarker>>();
}
