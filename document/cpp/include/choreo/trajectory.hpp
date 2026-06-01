#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "choreo/parameters.hpp"
#include "choreo/trajectory/output.hpp"
#include <wpi/util/json.hpp>
#include "choreo/event/event_marker.hpp"

namespace choreo {

struct TrajectoryFile {
  std::string name;
  std::uint32_t version;
  std::optional<Parameters> snapshot;
  Parameters params;
  std::optional<Trajectory> trajectory;
  std::vector<EventMarker> events;
};

inline void to_json(wpi::util::json& json, const TrajectoryFile& trajFile) {
  const wpi::util::json snapshot_json = trajFile.snapshot ?
      wpi::util::json(*trajFile.snapshot) : wpi::util::json();
  const wpi::util::json trajectory_json = trajFile.trajectory ?
      wpi::util::json(*trajFile.trajectory) : wpi::util::json();
  json = wpi::util::json::object("name", trajFile.name, "version",
                                 trajFile.version, "snapshot",
                                 snapshot_json, "params", trajFile.params,
                                 "trajectory", trajectory_json,
                                 "events", trajFile.events);
}
inline void from_json(const wpi::util::json& json, TrajectoryFile& trajFile) {
  trajFile.name = json.at("name").get_string();
  trajFile.version =
      static_cast<std::uint32_t>(json.at("version").get_number());
  if (json.contains("snapshot") && !json.at("snapshot").is_null()) {
    trajFile.snapshot = json.at("snapshot").get<Parameters>();
  } else {
    trajFile.snapshot = std::nullopt;
  }
  trajFile.params = json.at("params").get<Parameters>();
  if (json.contains("trajectory") && !json.at("trajectory").is_null()) {
    trajFile.trajectory = json.at("trajectory").get<Trajectory>();
  } else {
    trajFile.trajectory = std::nullopt;
  }

  trajFile.events = json.at("events").get_array() |
  std::views::transform([](const wpi::util::json& eventJson) { return
  eventJson.get<EventMarker>(); }) | std::ranges::to<std::vector<EventMarker>>();
}
}  // namespace choreo