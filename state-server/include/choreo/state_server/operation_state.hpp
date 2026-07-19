#pragma once

#include <stdexcept>
#include <string>

#include <wpi/util/json.hpp>

namespace choreo::state_server {

/// Enumeration of possible operation states
enum class OperationState {
  kCreated,      ///< Operation has been created but not yet queued
  kRunning,      ///< Generator process actively executing
  kCompleted,    ///< Operation finished successfully
  kFailed,       ///< Operation encountered an error
  kCancelled,    ///< Operation was cancelled by user
  kQueued        ///< Operation is queued and waiting to be executed
};

// JSON serialization functions for OperationState
inline void to_json(wpi::util::json& json, const OperationState& state) {
  switch (state) {
    case OperationState::kCreated:
      json = "created";
      break;
    case OperationState::kRunning:
      json = "running";
      break;
    case OperationState::kCompleted:
      json = "completed";
      break;
    case OperationState::kFailed:
      json = "failed";
      break;
    case OperationState::kCancelled:
      json = "cancelled";
      break;
    case OperationState::kQueued:
      json = "queued";
      break;
  }
}

inline void from_json(const wpi::util::json& json, OperationState& state) {
  std::string state_str = json.get_string();
  if (state_str == "running") {
    state = OperationState::kRunning;
  } else if (state_str == "completed") {
    state = OperationState::kCompleted;
  } else if (state_str == "failed") {
    state = OperationState::kFailed;
  } else if (state_str == "cancelled") {
    state = OperationState::kCancelled;
  } else if (state_str == "created") {
    state = OperationState::kCreated;
  } else if (state_str == "queued") {
    state = OperationState::kQueued;
  } else {
    throw std::invalid_argument("Unknown operation state: " + state_str);
  }
}

}  // namespace choreo::state_server
