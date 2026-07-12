// Copyright (c) Choreo contributors

#pragma once

#include <concepts>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include <wpi/util/json.hpp>

#include "choreo/event/event_marker.hpp"
#include "choreo/parameters.hpp"
#include "choreo/project.hpp"
#include "choreo/trajectory/output.hpp"
#include "trajectory/swerve_sample.hpp"
#include "trajectory/differential_sample.hpp"

namespace choreo {

struct TrajectoryFile {
  static TrajectoryFile fromJson(const wpi::util::json& json);
  std::string name;
  std::uint32_t version;
  std::optional<RobotConfig> config;
  std::optional<Parameters> snapshot;
  Parameters params;
  DriveType drive_type;
  std::optional<std::variant<Trajectory<SwerveDriveType>, Trajectory<DifferentialDriveType>>> trajectory;
  std::vector<EventMarker> events;

  inline bool must_be_generated(const ProjectFile& projectFile) const {
    return !snapshot.has_value() ||
     !snapshot->equivalent(params) ||
      !trajectory.has_value() ||
       !config.has_value() ||
       !config->equivalent(projectFile.config);
  }
};

inline void to_json(wpi::util::json& json, const TrajectoryFile& trajFile) {
  const wpi::util::json config_json =
      trajFile.config ? wpi::util::json(*trajFile.config) : wpi::util::json();
  const wpi::util::json snapshot_json =
      trajFile.snapshot ? wpi::util::json(*trajFile.snapshot)
                        : wpi::util::json();
  wpi::util::json trajectory_json;
  std::string sample_type;
  if (trajFile.trajectory) {
    std::visit([&](auto&& arg){
      trajectory_json = wpi::util::json(arg);
      if (std::same_as<decltype(arg), Trajectory<SwerveDriveType>>) {
        sample_type = SwerveDriveType::tag;
      } else if (std::same_as<decltype(arg), Trajectory<DifferentialDriveType>>) {
        sample_type = DifferentialDriveType::tag;
      }
    }, *trajFile.trajectory);
  } else {
    trajectory_json = wpi::util::json();
  }
  json = wpi::util::json::object("name", trajFile.name, "version",
                                 trajFile.version, "config", config_json,
                                 "snapshot", snapshot_json, "params",
                                 trajFile.params, "trajectory", trajectory_json, "sample_type", sample_type,
                                 "events", trajFile.events);
}
inline void from_json(const wpi::util::json& json, TrajectoryFile& trajFile) {
  trajFile.name = json.at("name").get_string();
  trajFile.version =
      static_cast<std::uint32_t>(json.at("version").get_number());
  if (json.contains("config") && !json.at("config").is_null()) {
    trajFile.config = json.at("config").get<RobotConfig>();
  } else {
    trajFile.config = std::nullopt;
  }
  if (json.contains("snapshot") && !json.at("snapshot").is_null()) {
    trajFile.snapshot = json.at("snapshot").get<Parameters>();
  } else {
    trajFile.snapshot = std::nullopt;
  }
  trajFile.params = json.at("params").get<Parameters>();
  if (json.contains("trajectory") && !json.at("trajectory").is_null()) {
    const wpi::util::json& trajectory_json = json.at("trajectory");
    if (!trajectory_json.is_null()) {
      std::string s = trajectory_json.at("sample_type").get_string();
      if (s == SwerveDriveType::tag) {
        trajFile.trajectory = Trajectory<SwerveDriveType>::from_json(trajectory_json);
        trajFile.drive_type = DriveType::Swerve;
      } else if (s == DifferentialDriveType::tag) {
        trajFile.trajectory = Trajectory<DifferentialDriveType>::from_json(trajectory_json);
        trajFile.drive_type = DriveType::Differential;
      } else {
        throw std::invalid_argument("Parsing TrajectoryFile with unknown drive type" + s);
      }
    } else {
      trajFile.trajectory = std::nullopt;
    }
  } else {
    trajFile.trajectory = std::nullopt;
  }

  trajFile.events = json.at("events").get_array() |
                    std::views::transform([](const wpi::util::json& eventJson) {
                      return eventJson.get<EventMarker>();
                    }) |
                    std::ranges::to<std::vector<EventMarker>>();
}

inline TrajectoryFile TrajectoryFile::fromJson(const wpi::util::json& json) {
  TrajectoryFile value;
  from_json(json, value);
  return value;
}

}  // namespace choreo
