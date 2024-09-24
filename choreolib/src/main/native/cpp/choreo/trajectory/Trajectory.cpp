// Copyright (c) Choreo contributors

#include "choreo/trajectory/Trajectory.h"

#include <wpi/json.h>

using namespace choreo::trajectory;

void choreo::trajectory::to_json(wpi::json& json,
                                 const Trajectory<SwerveSample>& traj) {
  json = wpi::json{{"name", traj.name},
                   {"samples", traj.samples},
                   {"splits", traj.splits},
                   {"events", traj.events}};
}

void choreo::trajectory::from_json(const wpi::json& json,
                                   Trajectory<SwerveSample>& traj) {
  traj.name = json.at("name").get<std::string>();
  traj.samples = json.at("traj").at("samples").get<std::vector<SwerveSample>>();
  traj.splits = json.at("traj").at("splits").get<std::vector<int>>();
  traj.events = json.at("events").get<std::vector<EventMarker>>();
}

void choreo::trajectory::to_json(wpi::json& json,
                                 const Trajectory<DifferentialSample>& traj) {
  json = wpi::json{{"name", traj.name},
                   {"samples", traj.samples},
                   {"splits", traj.splits},
                   {"events", traj.events}};
}

void choreo::trajectory::from_json(const wpi::json& json,
                                   Trajectory<DifferentialSample>& traj) {
  traj.samples = json.at("traj").at("samples").get<std::vector<DifferentialSample>>();
  traj.splits = json.at("traj").at("splits").get<std::vector<int>>();
  traj.events = json.at("events").get<std::vector<EventMarker>>();
}
