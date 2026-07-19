#pragma once

#include <chrono>
#include <filesystem>
#include <memory>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <utility>
#include <vector>

#include <choreo/project.hpp>
#include <choreo/trajectory.hpp>
#include <wpi/net/EventLoopRunner.hpp>
#include <wpi/net/WebSocket.hpp>
#include <wpi/net/uv/Pipe.hpp>
#include <wpi/net/uv/Process.hpp>
#include <wpi/net/uv/Tcp.hpp>

#include "choreo/rest_router/router.hpp"
#include "choreo/state_server/completion_status.hpp"
#include "history_engine.hpp"
#include "choreo/state_server/operation_id.hpp"
#include "choreo/state_server/operation_state.hpp"
#include "choreo/state_server/operation_record.hpp"
#include "choreo/state_server/server_options.hpp"


namespace choreo::state_server {

/// Central REST API server for the Choreo state management system
///
/// The ApiServer manages:
/// - Project and trajectory document persistence
/// - HTTP REST API for clients (renderer, CLI, etc.)
/// - Generation request lifecycle (create, launch, track progress)
/// - Real-time progress event streaming from generator processes
/// - Operation history and status tracking
class ApiServer {
 public:
  /// Constructs an API server with optional configuration
  /// @param options Server configuration (bind address, ports)
  explicit ApiServer(ServerOptions options = {});

  /// Starts the server and begins listening on configured ports
  /// @return true if server started successfully
  bool Start();

  /// Stops the server and closes all client connections
  void Stop();

  /// Processes a progress frame received from a producer websocket
  ///
  /// Producer websocket role:
  /// - Connects to /progress/{operationId}
  /// - Sends raw progress JSON frames for one operation
  ///
  /// Subscriber websocket role:
  /// - Connects to /progress
  /// - Receives rebroadcast frames wrapped with { operationId, frame }
  ///
  /// This method updates operation state and rebroadcasts wrapped frames to
  /// subscribers.
  /// @param operation_id Unique identifier for the generation operation
  /// @param frame Progress event data (JSON formatted)
  void HandleGeneratorProgressEvent(uint64_t operation_id,
                                    std::string_view frame);

  /// Registers a /progress subscriber websocket.
  ///
  /// Subscribers are read-only consumers; they do not send producer frames.
  void RegisterProgressSubscriber(
      const std::shared_ptr<wpi::net::WebSocket>& ws);

 private:
  std::expected<std::string, rest_router::Response> CheckRouteTrajectoryUUID( const rest_router::Request& request, const rest_router::RouteParams& params, std::string key = "uuid");
  std::expected<OperationId, rest_router::Response> CheckRouteOperationId(const rest_router::RouteParams& params, std::string key = "operationId");
  /// Represents an active client connection to the server
  struct ConnectionHandle {
    /// TCP socket for reading/writing data
    std::shared_ptr<wpi::net::uv::Tcp> stream;
    /// Opaque connection state managed by the router
    std::shared_ptr<void> connection;
  };

  /// Registers HTTP REST routes for document and generation endpoints
  void RegisterRoutes();

  /// Registers REST routes for project/trajectory document operations
  void RegisterDocumentRoutes();

  /// Registers REST routes for generation request and status operations
  void RegisterGenerationRoutes();

  /// Loads initial project and trajectories from the configured workspace directory.
  /// Requires exactly one .chor file and zero or more .traj files.
  bool LoadInitialStateFromWorkspace();

  /// Accepts an incoming client connection on the main HTTP port
  void AcceptClient();

  /// Accepts websocket connections on the internal progress relay port.
  ///
  /// Supported websocket paths:
  /// - /progress/{operationId}: producer ingress (generator -> state-server)
  /// - /progress: subscriber egress (state-server -> observers)
  void AcceptProgressClient();

  /// Rebroadcasts producer progress frames to all /progress subscribers.
  ///
  /// Each rebroadcast payload is JSON: { operationId, frame }.
  void BroadcastProgressFrame(uint64_t operation_id, std::string_view frame);

  /// Attempts to locate the trajectory generator executable in the system
  /// @return Path to generator executable, or empty if not found
  std::optional<std::filesystem::path> ResolveGeneratorExecutable() const;

  /// Launches a generator process for the specified trajectory
  /// @param operation_id Unique identifier for this generation operation
  /// @param trajectory_uuid UUID of the trajectory to generate
  void LaunchGenerationProcess(uint64_t operation_id,
                               const std::string& trajectory_uuid);

  /// Persists current project and trajectory state to disk for recovery
  void PersistStateSnapshot() const;

  /// Ensures the provided value is a valid UUID; generates one if needed
  /// @param value [in/out] UUID string to validate or generate
  void EnsureUuid(std::string& value);

  /// Generates a new UUID v4 string
  /// @return Newly generated UUID
  std::string GenerateUuid();

  /// Gets the current revision token for project-wide changes
  /// @return String representation of project revision number
  std::string ProjectRevisionToken() const;

  /// Gets the current revision token for a specific trajectory
  /// @param uuid UUID of the trajectory
  /// @return String representation of trajectory revision number
  std::string TrajectoryRevisionToken(const std::string& uuid) const;

    [[nodiscard]] std::string ProjectScopeKey() const;
    [[nodiscard]] std::string TrajectoryScopeKey(std::string_view uuid) const;

    [[nodiscard]] std::optional<wpi::util::json> CaptureScopeSnapshot(
      std::string_view scope_key) const;
    bool ApplyScopeSnapshot(std::string_view scope_key,
                const wpi::util::json& snapshot,
                std::string& error_message);
    bool BumpScopeRevision(std::string_view scope_key);
    [[nodiscard]] std::optional<std::string> CurrentScopeRevisionToken(
      std::string_view scope_key) const;

    std::optional<rest_router::Response> HandleUndo(std::string_view scope_key);
    std::optional<rest_router::Response> HandleRedo(std::string_view scope_key);

  /// Server configuration (bind address and port settings)
  ServerOptions m_options;

  /// Event loop runner for asynchronous I/O operations using libuv
  wpi::net::EventLoopRunner m_loop_runner;

  /// Main TCP server socket for handling HTTP client connections
  std::shared_ptr<wpi::net::uv::Tcp> m_server;

  /// Internal TCP server for progress relay websocket traffic
  ///
  /// Hosts both producer ingress (/progress/{operationId}) and subscriber
  /// egress (/progress) endpoints.
  std::shared_ptr<wpi::net::uv::Tcp> m_progress_server;

  /// Active HTTP client connections
  std::vector<ConnectionHandle> m_connections;

  /// Active websocket transport connections accepted by m_progress_server
  std::vector<ConnectionHandle> m_progress_connections;

  /// Read-only subscribers connected to /progress
  ///
  /// Each receives wrapped frames for all operations.
  std::vector<std::weak_ptr<wpi::net::WebSocket>> m_progress_subscribers;

  /// REST router for handling HTTP method routing and request dispatch
  rest_router::Router m_router;

  /// In-memory project document (synced to disk)
  ProjectFile m_project;

  /// Map of trajectory UUID to trajectory document
  std::unordered_map<std::string, TrajectoryFile> m_trajectories;

  /// Map of operation ID to operation records (tracks generation requests)
  std::unordered_map<uint64_t, OperationRecord> m_operations;

  /// Map tracking the most recent operation for each trajectory (UUID ->
  /// operation ID)
  std::unordered_map<std::string, uint64_t> m_latest_operation_by_trajectory;

  /// Map of active generator processes (operation ID -> Process handle)
  std::unordered_map<uint64_t, std::shared_ptr<wpi::net::uv::Process>>
      m_running_generation_processes;

    /// Active generator stdout pipes (operation ID -> Pipe handle)
    std::unordered_map<uint64_t, std::shared_ptr<wpi::net::uv::Pipe>>
      m_running_generation_stdout_pipes;

    /// Active generator stderr pipes (operation ID -> Pipe handle)
    std::unordered_map<uint64_t, std::shared_ptr<wpi::net::uv::Pipe>>
      m_running_generation_stderr_pipes;

  /// Incremental revision counter for project-wide changes
  uint64_t m_project_revision = 1;

  /// Per-trajectory revision counters for change tracking
  std::unordered_map<std::string, uint64_t> m_trajectory_revisions;

  /// Generic in-memory undo/redo history engine scoped by resource key.
  HistoryEngine m_history{50};

  /// Timestamp when the server started
  std::chrono::steady_clock::time_point m_started_at;
};

}  // namespace choreo::state_server
