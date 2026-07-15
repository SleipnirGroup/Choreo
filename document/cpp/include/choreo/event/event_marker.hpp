// Copyright (c) Choreo contributors

#pragma once

#include <optional>
#include <string>
#include <variant>
#include <vector>

#include <wpi/util/json.hpp>

#include "choreo/constraint.hpp"
#include "choreo/expr.hpp"
#include "choreo/variables/dimension.hpp"
namespace choreo {

struct EventMarkerData {
  EventMarkerData() = default;
  EventMarkerData(const EventMarkerData&) = default;
  static EventMarkerData fromJson(const wpi::util::json& json);
  std::optional<WaypointID> target;
  std::optional<dimensions::Time::baseUnit> targetTimestamp;
  Expr<dimensions::Time> offset;

  void updateTimestamp(const std::vector<Waypoint>& waypoints,
                       const std::vector<wpi::units::second_t>& waypoint_timestamps) {
    if (!target.has_value()) {
      return;
    }
    auto index = getWaypointIndex(*target, waypoints);
    if (index.has_value() && index.value() < waypoint_timestamps.size()) {
      targetTimestamp = waypoint_timestamps[index.value()];
    }
  }
};

inline void to_json(wpi::util::json& json, const EventMarkerData& data) {
  const wpi::util::json target_json =
      data.target ? wpi::util::json(*data.target) : wpi::util::json();
  const wpi::util::json target_timestamp_json =
      data.targetTimestamp ? wpi::util::json(data.targetTimestamp->value())
                           : wpi::util::json();
  json = wpi::util::json::object("target", target_json, "targetTimestamp",
                                 target_timestamp_json, "offset", data.offset);
}

inline void from_json(const wpi::util::json& json, EventMarkerData& data) {
  if (json.contains("target") && !json.at("target").empty()) {
    data.target = json.at("target").get<WaypointID>();
  } else {
    data.target = std::nullopt;
  }
  if (json.contains("targetTimestamp") && !json.at("targetTimestamp").empty()) {
    data.targetTimestamp = static_cast<dimensions::Time::baseUnit>(
        json.at("targetTimestamp").get_number());
  } else {
    data.targetTimestamp = std::nullopt;
  }
  data.offset = json.at("offset").get<Expr<dimensions::Time>>();
}

inline EventMarkerData EventMarkerData::fromJson(const wpi::util::json& json) {
  EventMarkerData value;
  from_json(json, value);
  return value;
}

struct EventMarker {
  EventMarker() = default;
  EventMarker(const EventMarker&) = default;
  static EventMarker fromJson(const wpi::util::json& json);
  std::string uuid;
  std::string name;
  EventMarkerData from;
};

inline void to_json(wpi::util::json& json, const EventMarker& marker) {
  json = wpi::util::json::object("uuid", marker.uuid, "name", marker.name,
                                 "from", marker.from);
}
inline void from_json(const wpi::util::json& json, EventMarker& marker) {
  marker.uuid = json.at("uuid").get_string();
  marker.name = json.at("name").get_string();
  marker.from = json.at("from").get<EventMarkerData>();
}

inline EventMarker EventMarker::fromJson(const wpi::util::json& json) {
  EventMarker value;
  from_json(json, value);
  return value;
}

}  // namespace choreo
