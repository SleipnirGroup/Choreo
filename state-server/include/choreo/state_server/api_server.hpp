#pragma once

#include <chrono>
#include <filesystem>
#include <memory>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

#include <choreo/project.hpp>
#include <choreo/trajectory.hpp>
#include <wpi/net/EventLoopRunner.hpp>
#include <wpi/net/uv/Process.hpp>
#include <wpi/net/uv/Tcp.hpp>

#include "choreo/rest_router/router.hpp"

namespace choreo::state_server {

struct ServerOptions {
  std::string bind_address = "127.0.0.1";
  uint16_t http_port = 5810;
  uint16_t internal_progress_port = 5811;
};

class ApiServer {
 public:
  explicit ApiServer(ServerOptions options = {});

  bool Start();
  void Stop();
  void HandleGeneratorProgressEvent(std::string operation_id,
                                    std::string_view frame);

 private:
  struct OperationRecord {
    std::string id;
    std::string trajectory_uuid;
    std::string state;
    std::string started_at;
    std::string updated_at;
    std::optional<std::string> error_message;
    std::optional<std::string> result_revision;
    std::optional<std::string> completion_status;
    std::optional<std::string> last_progress_event;
  };

  struct ConnectionHandle {
    std::shared_ptr<wpi::net::uv::Tcp> stream;
    std::shared_ptr<void> connection;
  };

  void RegisterRoutes();
  void RegisterDocumentRoutes();
  void RegisterGenerationRoutes();
  void AcceptClient();
  void AcceptProgressClient();
  std::optional<std::filesystem::path> ResolveGeneratorExecutable() const;
  void LaunchGenerationProcess(const std::string& operation_id,
                               const std::string& trajectory_uuid);
  void PersistStateSnapshot() const;

  void EnsureUuid(std::string& value);
  std::string GenerateUuid();
  std::string ProjectRevisionToken() const;
  std::string TrajectoryRevisionToken(const std::string& uuid) const;

  ServerOptions m_options;
  wpi::net::EventLoopRunner m_loop_runner;
  std::shared_ptr<wpi::net::uv::Tcp> m_server;
  std::shared_ptr<wpi::net::uv::Tcp> m_progress_server;
  std::vector<ConnectionHandle> m_connections;
  std::vector<ConnectionHandle> m_progress_connections;

  rest_router::Router m_router;
  ProjectFile m_project;
  std::unordered_map<std::string, TrajectoryFile> m_trajectories;
  std::unordered_map<std::string, OperationRecord> m_operations;
  std::unordered_map<std::string, std::string> m_latest_operation_by_trajectory;
  std::unordered_map<std::string, std::shared_ptr<wpi::net::uv::Process>>
      m_running_generation_processes;

  uint64_t m_project_revision = 1;
  std::unordered_map<std::string, uint64_t> m_trajectory_revisions;
  std::chrono::steady_clock::time_point m_started_at;
};

}  // namespace choreo::state_server
