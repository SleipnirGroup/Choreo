#pragma once

#include <atomic>
#include <chrono>
#include <optional>
#include <sstream>
#include <string>

#include <wpi/util/json.hpp>

#include "choreo/state_server/operation_state.hpp"

namespace choreo::state_server {

/// Converts a system_clock::time_point to an ISO 8601 datetime string
inline std::string timePointToJson(const std::chrono::system_clock::time_point& tp) {
    // The std::formatter for std::chrono::system_clock::time_point is already the ISO 8601 format
  return std::format("{}", tp);
}

// Helper function to convert ISO 8601 datetime string to
// system_clock::time_point
inline std::chrono::system_clock::time_point jsonToTimePoint(
    const std::string& iso_str) {
// Source - https://stackoverflow.com/a/38839725
// Posted by Howard Hinnant, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-18, License - CC BY-SA 4.0
    std::istringstream is{iso_str};
    std::string save;
    is >> save;
    std::istringstream in{save};
    std::chrono::sys_time<std::chrono::milliseconds> tp;
    in >> std::chrono::parse("%FT%TZ", tp);
    return tp;
}

struct OperationTimestamps {
  std::chrono::system_clock::time_point submitted_at;
  std::optional<std::chrono::system_clock::time_point> started_at;
  std::optional<std::chrono::system_clock::time_point> updated_at;
  std::optional<std::chrono::system_clock::time_point> completed_at;
};

inline void to_json(wpi::util::json& json, const OperationTimestamps timestamps) {
    json["submitted_at"] = timePointToJson(timestamps.submitted_at);
    if (timestamps.started_at.has_value()) {
        json["started_at"] = timePointToJson(timestamps.started_at.value());
    }
    if (timestamps.updated_at.has_value()) {
        json["updated_at"] = timePointToJson(timestamps.updated_at.value());
    }
    if (timestamps.completed_at.has_value()) {
        json["completed_at"] = timePointToJson(timestamps.completed_at.value());
    }
}

// from_json for operation timestamps
inline void from_json(const wpi::util::json& json, OperationTimestamps& timestamps) {
    timestamps.submitted_at = jsonToTimePoint(json.at("submitted_at").get_string());
    if (json.contains("started_at")) {
        timestamps.started_at = jsonToTimePoint(json.at("started_at").get_string());
    }
    if (json.contains("updated_at")) {
        timestamps.updated_at = jsonToTimePoint(json.at("updated_at").get_string());
    }
    if (json.contains("completed_at")) {
        timestamps.completed_at = jsonToTimePoint(json.at("completed_at").get_string());
    }
}
/// Represents a recorded generation operation with current state and metadata
struct OperationRecord {
  /// UUID of the trajectory being generated
  std::string trajectory_uuid;
  /// Current state of the operation
  OperationState state;
  /// Timestamps for the operation
  OperationTimestamps timestamps;
  /// Error message if generation failed
  std::optional<std::string> error_message;
  /// Trajectory revision at completion
  std::optional<std::string> result_revision;
  /// Most recent progress event frame from generator
  std::optional<std::string> last_progress_event;

  /// Constructs a new operation record for the given trajectory UUID.
  /// @param trajectory_uuid UUID of the trajectory being generated
  /// Marks the submitted_at timestamp at time of construction.
  /// Initializes the operation in the created-but-not-queued state.
  explicit OperationRecord(std::string trajectory_uuid)
      : trajectory_uuid(std::move(trajectory_uuid)),
        timestamps{std::chrono::system_clock::now(), std::nullopt, std::nullopt, std::nullopt},
        error_message(std::nullopt),
        result_revision(std::nullopt),
        last_progress_event(std::nullopt),
        state(OperationState::kCreated) {}

  /// Marks the operation as started and sets started_at timestamp
  inline void markStarted() {
    state = OperationState::kRunning;
    timestamps.started_at = std::chrono::system_clock::now();
    timestamps.updated_at = timestamps.started_at;
  }

  /// Marks the operation as queued and sets the updated_at timestamp
  inline void markQueued() {
    state = OperationState::kQueued;
    timestamps.updated_at = std::chrono::system_clock::now();
  }
  /// Marks the operation as failed with an error message
  inline void markFailed(std::string error) {
    state = OperationState::kFailed;
    error_message = std::move(error);
    timestamps.completed_at = std::chrono::system_clock::now();
    timestamps.updated_at = timestamps.completed_at;
  }

  /// Marks the operation as completed
  inline void markComplete(std::string result_revision = "") {
    state = OperationState::kCompleted;
    timestamps.completed_at = std::chrono::system_clock::now();
    timestamps.updated_at = timestamps.completed_at;
    this->result_revision = std::move(result_revision);
  }

  /// Marks the operation as cancelled
  inline void markCancelled() {
    state = OperationState::kCancelled;
    timestamps.completed_at = std::chrono::system_clock::now();
    timestamps.updated_at = timestamps.completed_at;
  }

  /// Checks if the operation is in a terminal state
  inline bool isDone() const {
    return state == OperationState::kCompleted ||
           state == OperationState::kFailed ||
           state == OperationState::kCancelled;
  }

  /// Checks if the operation is queued
  inline bool isQueued() const { return state == OperationState::kQueued; }

  /// Checks if the operation is running
  inline bool isRunning() const { return state == OperationState::kRunning; }
};



// JSON serialization functions for OperationRecord
inline void to_json(wpi::util::json& json, const OperationRecord& record) {
  json["trajectory_uuid"] = record.trajectory_uuid;
  json["state"] = record.state;
  json["timestamps"] = record.timestamps;
  if (record.error_message.has_value()) {
    json["error_message"] = record.error_message.value();
  }
  if (record.result_revision.has_value()) {
    json["result_revision"] = record.result_revision.value();
  }
  if (record.last_progress_event.has_value()) {
    json["last_progress_event"] = record.last_progress_event.value();
  }
}

inline void from_json(const wpi::util::json& json, OperationRecord& record) {
  record.trajectory_uuid = json.at("trajectory_uuid").get_string();
  record.state = json.at("state").get<OperationState>();

  record.timestamps = json.at("timestamps").get<OperationTimestamps>();
  if (json.contains("error_message")) {
    record.error_message = json.at("error_message").get_string();
  }
  if (json.contains("result_revision")) {
    record.result_revision = json.at("result_revision").get_string();
  }
  if (json.contains("last_progress_event")) {
    record.last_progress_event = json.at("last_progress_event").get_string();
  }
}

}  // namespace choreo::state_server
