#pragma once

#include <stdexcept>
#include <string>

#include <wpi/util/json.hpp>

namespace choreo::state_server {

/// Enumeration of possible operation completion statuses
enum class CompletionStatus {
  kSuccess,   ///< Operation completed successfully
  kCancelled, ///< Operation was cancelled by user
  kFailed     ///< Operation failed with an error
};

// JSON serialization functions for CompletionStatus
inline void to_json(wpi::util::json& json, const CompletionStatus& status) {
  switch (status) {
    case CompletionStatus::kSuccess:
      json = "success";
      break;
    case CompletionStatus::kCancelled:
      json = "cancelled";
      break;
    case CompletionStatus::kFailed:
      json = "failed";
      break;
  }
}

inline void from_json(const wpi::util::json& json, CompletionStatus& status) {
  std::string status_str = json.get_string();
  if (status_str == "success") {
    status = CompletionStatus::kSuccess;
  } else if (status_str == "cancelled") {
    status = CompletionStatus::kCancelled;
  } else if (status_str == "failed") {
    status = CompletionStatus::kFailed;
  } else {
    throw std::invalid_argument("Unknown completion status: " + status_str);
  }
}

}  // namespace choreo::state_server
