#pragma once

#include <cstdint>
#include <filesystem>
#include <string>

#include <wpi/util/json.hpp>

namespace choreo::state_server {

/// Configuration options for the API server
/// Specifies the network binding address and port assignments
struct ServerOptions {
  /// IP address to bind the server to (default: localhost)
  std::string bind_address = "127.0.0.1";
  /// Port for HTTP REST API requests
  uint16_t http_port = 5810;
  /// Port for internal progress relay websocket traffic
  ///
  /// Endpoints on this port:
  /// - /progress/{operationId}: producer ingress for generator frames
  /// - /progress: subscriber egress for wrapped rebroadcast frames
  uint16_t internal_progress_port = 5811;

  /// Directory containing one project (.chor) and zero or more trajectories (.traj)
  std::filesystem::path workspace_dir;
};

// JSON serialization functions for ServerOptions
inline void to_json(wpi::util::json& json, const ServerOptions& options) {
  json["bind_address"] = options.bind_address;
  json["http_port"] = options.http_port;
  json["internal_progress_port"] = options.internal_progress_port;
  json["workspace_dir"] = options.workspace_dir.string();
}

inline void from_json(const wpi::util::json& json, ServerOptions& options) {
  options.bind_address = json.at("bind_address").get_string();
  options.http_port = static_cast<uint16_t>(json.at("http_port").get_int());
  options.internal_progress_port =
      static_cast<uint16_t>(json.at("internal_progress_port").get_int());
  if (json.contains("workspace_dir") && json.at("workspace_dir").is_string()) {
    options.workspace_dir = json.at("workspace_dir").get_string();
  }
}

}  // namespace choreo::state_server
