// Copyright (c) Choreo contributors

#include "choreo/trajectory/Trajectory.hpp"

#include <string>
#include <vector>

#include <wpi/util/json.hpp>

namespace {

template <typename T>
std::vector<T> readJsonVector(const wpi::util::json& jsonArray) {
  std::vector<T> values;
  const auto& array = jsonArray.get_array();
  values.reserve(array.size());
  for (const auto& element : array) {
    values.push_back(element.get<T>());
  }
  return values;
}

std::vector<int> readJsonIntVector(const wpi::util::json& jsonArray) {
  std::vector<int> values;
  const auto& array = jsonArray.get_array();
  values.reserve(array.size());
  for (const auto& element : array) {
    values.push_back(static_cast<int>(element.get_int()));
  }
  return values;
}

}  // namespace

void choreo::to_json(wpi::util::json& json,
                     const Trajectory<SwerveSample>& trajectory) {
  json = wpi::util::json::object(
      "name", trajectory.name.c_str(), "samples", trajectory.samples, "splits",
      trajectory.splits, "events", trajectory.events);
}

void choreo::from_json(const wpi::util::json& json,
                       Trajectory<SwerveSample>& trajectory) {
  trajectory.name = json.at("name").get_string();
  const auto& trajectoryJson = json.at("trajectory");
  trajectory.samples =
      readJsonVector<SwerveSample>(trajectoryJson.at("samples"));
  trajectory.splits = readJsonIntVector(trajectoryJson.at("splits"));
  // Add 0 as the first split index.
  if (trajectory.splits.size() == 0 || trajectory.splits.at(0) != 0) {
    trajectory.splits.insert(trajectory.splits.begin(), 0);
  }
  auto events = readJsonVector<EventMarker>(json.at("events"));
  trajectory.events.clear();
  for (EventMarker event : events) {
    if (event.timestamp >= wpi::units::second_t{0} || event.event.size() == 0) {
      trajectory.events.push_back(event);
    }
  }
}

void choreo::to_json(wpi::util::json& json,
                     const Trajectory<DifferentialSample>& trajectory) {
  json = wpi::util::json::object(
      "name", trajectory.name.c_str(), "samples", trajectory.samples, "splits",
      trajectory.splits, "events", trajectory.events);
}

void choreo::from_json(const wpi::util::json& json,
                       Trajectory<DifferentialSample>& trajectory) {
  const auto& trajectoryJson = json.at("trajectory");
  trajectory.samples =
      readJsonVector<DifferentialSample>(trajectoryJson.at("samples"));
  trajectory.splits = readJsonIntVector(trajectoryJson.at("splits"));
  // Add 0 as the first split index.
  if (trajectory.splits.size() == 0 || trajectory.splits.at(0) != 0) {
    trajectory.splits.insert(trajectory.splits.begin(), 0);
  }
  auto events = readJsonVector<EventMarker>(json.at("events"));
  trajectory.events.clear();
  for (EventMarker event : events) {
    if (event.timestamp >= wpi::units::second_t{0} || event.event.size() == 0) {
      trajectory.events.push_back(event);
    }
  }
}
