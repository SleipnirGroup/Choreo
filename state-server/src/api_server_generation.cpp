#include "choreo/state_server/api_server.hpp"

#include "api_server_internal.hpp"

#include <csignal>
#include <cstdio>
#include <filesystem>
#include <fstream>
#include <format>
#include <memory>
#include <thread>

#include <wpi/net/HttpWebSocketServerConnection.hpp>
#include <wpi/net/UrlParser.hpp>
#include <wpi/util/json.hpp>

namespace choreo::state_server {

namespace {

using choreo::rest_router::HttpMethod;
using choreo::rest_router::RouteParams;
using choreo::rest_router::Request;
using choreo::rest_router::Response;
using namespace choreo::state_server::detail;

class ProgressRelayConnection
    : public wpi::net::HttpWebSocketServerConnection<ProgressRelayConnection> {
 public:
  ProgressRelayConnection(std::shared_ptr<wpi::net::uv::Stream> stream,
                          ApiServer& owner)
      : HttpWebSocketServerConnection(std::move(stream), {}), m_owner(owner) {}

 protected:
  void ProcessRequest() override { SendError(404, "Not Found"); }

  bool IsValidWsUpgrade(std::string_view) override {
    wpi::net::UrlParser parser{m_request.GetUrl(),
                               m_request.GetMethod() == wpi::net::HTTP_CONNECT};
    if (!parser.IsValid() || !parser.HasPath()) {
      return false;
    }
    return parser.GetPath().starts_with("/progress/");
  }

  void ProcessWsUpgrade() override {
    auto ws = m_websocket->shared_from_this();
    wpi::net::UrlParser parser{m_request.GetUrl(),
                               m_request.GetMethod() == wpi::net::HTTP_CONNECT};
    if (!parser.IsValid() || !parser.HasPath()) {
      ws->Close(1008, "invalid upgrade path");
      return;
    }

    const auto path = parser.GetPath();
    constexpr std::string_view prefix = "/progress/";
    if (!path.starts_with(prefix) || path.size() <= prefix.size()) {
      ws->Close(1008, "invalid progress path");
      return;
    }

    const std::string operation_id{path.substr(prefix.size())};
    ws->text.connect([this, operation_id](std::string_view data, bool) {
      m_owner.HandleGeneratorProgressEvent(operation_id, data);
    });
  }

 private:
  ApiServer& m_owner;
};

}  // namespace

void ApiServer::RegisterGenerationRoutes() {
  // Route: Start asynchronous trajectory generation.
  // Preconditions: trajectory must exist and If-Match must match its current ETag.
  // Body: optional JSON object for generation options.
  // Response: 202 with { operationId, state } and background generator launch.
  m_router.Register(HttpMethod::kPost,
                    "/api/v1/trajectories/{uuid}/generate",
                    [this](const Request& request, const RouteParams& params) {
                      const auto trajectory_uuid = FindRouteParam(params, "uuid");
                      if (!trajectory_uuid.has_value()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }
                      const auto& trajectory_uuid_value = trajectory_uuid->get();

                      if (!FindMappedValue(m_trajectories, trajectory_uuid_value)) {
                        return NotFound("Trajectory not found");
                      }

                      const auto current_revision =
                          TrajectoryRevisionToken(trajectory_uuid_value);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        if (!request.body.empty()) {
                          auto body = wpi::util::json::parse_or_throw(
                              std::string_view{request.body});
                          if (!body.is_object()) {
                            return InvalidJson("Request body must be a JSON object");
                          }
                        }
                      } catch (const std::exception& ex) {
                        return InvalidJson(ex.what());
                      }

                      OperationRecord record;
                      record.id = GenerateUuid();
                      record.trajectory_uuid = trajectory_uuid_value;
                      record.state = "queued";
                      record.started_at = NowIso8601Utc();
                      record.updated_at = record.started_at;
                      record.error_message = std::nullopt;
                      record.result_revision = std::nullopt;
                      record.completion_status = std::nullopt;
                      record.last_progress_event = std::nullopt;
                      m_latest_operation_by_trajectory[trajectory_uuid_value] = record.id;
                      m_operations[record.id] = record;

                      LaunchGenerationProcess(record.id, trajectory_uuid_value);

                      wpi::util::json body = wpi::util::json::object();
                      body["operationId"] = record.id;
                      body["state"] = record.state;
                      return JsonResponse(202, body);
                    });

  // Route: Fetch generation status for a trajectory.
  // Preconditions: trajectory must exist.
  // Body: none.
  // Response: 200 with { trajectoryUuid, queuePosition, latestOperationId, lastCompletionStatus }.
  m_router.Register(HttpMethod::kGet,
                    "/api/v1/trajectories/{uuid}/generation-state",
                    [this](const Request&, const RouteParams& params) {
                      const auto trajectory_uuid = FindRouteParam(params, "uuid");
                      if (!trajectory_uuid.has_value()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }
                      const auto& trajectory_uuid_value = trajectory_uuid->get();

                      if (!FindMappedValue(m_trajectories, trajectory_uuid_value)) {
                        return NotFound("Trajectory not found");
                      }

                      wpi::util::json body = wpi::util::json::object();
                      body["trajectoryUuid"] = trajectory_uuid_value;
                      body["queuePosition"] = nullptr;
                      body["latestOperationId"] = nullptr;
                      body["lastCompletionStatus"] = nullptr;

                        const auto latest_it =
                          m_latest_operation_by_trajectory.find(trajectory_uuid_value);
                      if (latest_it != m_latest_operation_by_trajectory.end()) {
                        body["latestOperationId"] = latest_it->second;
                        const auto op_it = m_operations.find(latest_it->second);
                        if (op_it != m_operations.end() && op_it->second.completion_status) {
                          body["lastCompletionStatus"] =
                              *op_it->second.completion_status;
                        }
                      }

                      return JsonResponse(200, body);
                    });

  // Route: Cancel all active generation work for one trajectory.
  // Preconditions: trajectory must exist and If-Match must match its current ETag.
  // Body: none.
  // Response: 202 with { operationId, state, cancelledCount }.
  m_router.Register(HttpMethod::kPost,
                    "/api/v1/trajectories/{uuid}/generate/cancel-all",
                    [this](const Request& request, const RouteParams& params) {
                      const auto trajectory_uuid = FindRouteParam(params, "uuid");
                      if (!trajectory_uuid.has_value()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }
                      const auto& trajectory_uuid_value = trajectory_uuid->get();

                      if (!FindMappedValue(m_trajectories, trajectory_uuid_value)) {
                        return NotFound("Trajectory not found");
                      }

                      const auto current_revision =
                          TrajectoryRevisionToken(trajectory_uuid_value);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      int cancelled_count = 0;
                      for (auto& [_, op] : m_operations) {
                        if (op.trajectory_uuid != trajectory_uuid_value) {
                          continue;
                        }
                        if (op.state == "queued" || op.state == "running") {
                          if (auto proc_it =
                                  m_running_generation_processes.find(op.id);
                              proc_it != m_running_generation_processes.end() &&
                              proc_it->second) {
                            proc_it->second->Kill(SIGTERM);
                          }
                          op.state = "cancelled";
                          op.completion_status = "cancelled";
                          op.updated_at = NowIso8601Utc();
                          ++cancelled_count;
                        }
                      }

                      wpi::util::json body = wpi::util::json::object();
                      body["operationId"] = GenerateUuid();
                      body["state"] = "completed";
                      body["cancelledCount"] = cancelled_count;
                      return JsonResponse(202, body);
                    });

  // Route: Fetch detailed operation state.
  // Preconditions: operationId must exist.
  // Body: none.
  // Response: 200 with operation timing, status, error, revision, and last relayed progress frame.
  m_router.Register(HttpMethod::kGet, "/api/v1/operations/{operationId}",
                    [this](const Request&, const RouteParams& params) {
                      const auto operation_id = FindRouteParam(params, "operationId");
                      if (!operation_id.has_value()) {
                        return BadRoute("Missing operationId parameter");
                      }
                      const auto& operation_id_value = operation_id->get();

                      const auto operation =
                          FindMappedValue(m_operations, operation_id_value);
                      if (!operation.has_value()) {
                        return NotFound("Operation not found");
                      }
                      const auto& operation_value = operation->get();

                      wpi::util::json body = wpi::util::json::object();
                      body["operationId"] = operation_value.id;
                      body["state"] = operation_value.state;
                      body["startedAt"] = operation_value.started_at;
                      body["updatedAt"] = operation_value.updated_at;
                      if (operation_value.error_message) {
                        body["error"] = wpi::util::json::object(
                            "code", "generation_error", "message",
                            *operation_value.error_message);
                      } else {
                        body["error"] = nullptr;
                      }
                      if (operation_value.result_revision) {
                        body["resultRevision"] = *operation_value.result_revision;
                      } else {
                        body["resultRevision"] = nullptr;
                      }
                      if (operation_value.last_progress_event) {
                        body["lastProgressEvent"] = *operation_value.last_progress_event;
                      } else {
                        body["lastProgressEvent"] = nullptr;
                      }

                      return JsonResponse(200, body);
                    });

  // Route: Cancel a specific operation.
  // Preconditions: operationId must exist and must not already be terminal.
  // Body: none.
  // Response: 202 with { operationId, state } after cancellation is requested.
  m_router.Register(HttpMethod::kPost,
                    "/api/v1/operations/{operationId}/cancel",
                    [this](const Request&, const RouteParams& params) {
                      const auto operation_id = FindRouteParam(params, "operationId");
                      if (!operation_id.has_value()) {
                        return BadRoute("Missing operationId parameter");
                      }
                      const auto& operation_id_value = operation_id->get();

                      auto operation = FindMappedValue(m_operations, operation_id_value);
                      if (!operation.has_value()) {
                        return NotFound("Operation not found");
                      }
                      auto& operation_value = operation->get();

                      if (operation_value.state == "completed" ||
                          operation_value.state == "failed" ||
                          operation_value.state == "cancelled") {
                        return Conflict("operation_terminal",
                            "Operation already reached a terminal state");
                      }

                      operation_value.state = "cancelled";
                      operation_value.completion_status = "cancelled";
                      operation_value.updated_at = NowIso8601Utc();
                      if (auto proc_it =
                              m_running_generation_processes.find(operation_value.id);
                          proc_it != m_running_generation_processes.end() &&
                          proc_it->second) {
                        proc_it->second->Kill(SIGTERM);
                      }

                      wpi::util::json body = wpi::util::json::object();
                      body["operationId"] = operation_value.id;
                      body["state"] = operation_value.state;
                      return JsonResponse(202, body);
                    });

  // Route: Fetch lightweight server diagnostics.
  // Preconditions: none.
  // Body: none.
  // Response: 200 with queue depth, active operation count, ws client count, and related metrics.
  m_router.Register(HttpMethod::kGet, "/api/v1/diagnostics",
                    [this](const Request&, const RouteParams&) {
                      int queue_depth = 0;
                      int active_operations = 0;
                      for (const auto& [_, op] : m_operations) {
                        if (op.state == "queued") {
                          ++queue_depth;
                        }
                        if (op.state == "queued" || op.state == "running") {
                          ++active_operations;
                        }
                      }

                      wpi::util::json body = wpi::util::json::object();
                      body["queueDepth"] = queue_depth;
                      body["activeOperations"] = active_operations;
                      body["avgPersistLatencyMs"] = 0.0;
                      body["wsClientCount"] =
                          static_cast<double>(m_connections.size());
                      body["lastErrorSummary"] = nullptr;

                      return JsonResponse(200, body);
                    });
}

void ApiServer::AcceptProgressClient() {
  auto client = m_progress_server->Accept();
  if (!client) {
    std::fprintf(stderr, "state-server: failed to accept progress client\n");
    return;
  }

  client->error.connect([ptr = client.get()](wpi::net::uv::Error) { ptr->Close(); });

  auto handler = std::make_shared<ProgressRelayConnection>(client, *this);
  client->SetData(handler);
  m_progress_connections.push_back(ConnectionHandle{client, handler});
}

void ApiServer::HandleGeneratorProgressEvent(std::string operation_id,
                                             std::string_view frame) {
  const auto op_it = m_operations.find(operation_id);
  if (op_it == m_operations.end()) {
    return;
  }

  op_it->second.last_progress_event = std::string(frame);
  op_it->second.updated_at = NowIso8601Utc();

  try {
    auto parsed = wpi::util::json::parse_or_throw(frame);
    if (!parsed.is_object() || !parsed.contains("event") ||
        !parsed.at("event").is_string()) {
      return;
    }

    const std::string event_name = parsed.at("event").get_string();
    if (event_name == "error") {
      op_it->second.state = "failed";
      op_it->second.completion_status = "failed";
      if (parsed.contains("payload") && parsed.at("payload").is_object() &&
          parsed.at("payload").contains("message") &&
          parsed.at("payload").at("message").is_string()) {
        op_it->second.error_message =
            parsed.at("payload").at("message").get_string();
      }
      return;
    }

    if (event_name == "completeTrajectory" && parsed.contains("payload") &&
        parsed.at("payload").is_object() &&
        parsed.at("payload").contains("trajectoryFile") &&
        parsed.at("payload").at("trajectoryFile").is_string()) {
      auto trajectory_json = wpi::util::json::parse_or_throw(
          parsed.at("payload").at("trajectoryFile").get_string());
      auto updated = TrajectoryFile::fromJson(trajectory_json);
      updated.uuid = op_it->second.trajectory_uuid;
      m_trajectories[updated.uuid] = std::move(updated);
      ++m_trajectory_revisions[op_it->second.trajectory_uuid];
      op_it->second.state = "completed";
      op_it->second.completion_status = "completed";
      op_it->second.result_revision =
          TrajectoryRevisionToken(op_it->second.trajectory_uuid);
      op_it->second.error_message = std::nullopt;
      PersistStateSnapshot();
      return;
    }

    if (op_it->second.state == "queued") {
      op_it->second.state = "running";
    }
  } catch (...) {
    // Ignore malformed progress payloads from generator stream.
  }
}

std::optional<std::filesystem::path> ApiServer::ResolveGeneratorExecutable() const {
  const std::vector<std::filesystem::path> candidates = {
      std::filesystem::current_path() / "build" / "generator.exe",
      std::filesystem::current_path() / "build" / "generator" /
          "generator.exe",
      std::filesystem::current_path() / "build" / "Debug" /
          "generator.exe",
      std::filesystem::current_path() / "build" / "generator" / "Debug" /
          "generator.exe",
  };

  for (const auto& candidate : candidates) {
    if (std::filesystem::exists(candidate)) {
      return candidate;
    }
  }
  return std::nullopt;
}

void ApiServer::LaunchGenerationProcess(const std::string& operation_id,
                                        const std::string& trajectory_uuid) {
  const auto op_it = m_operations.find(operation_id);
  const auto traj_it = m_trajectories.find(trajectory_uuid);
  if (op_it == m_operations.end() || traj_it == m_trajectories.end()) {
    return;
  }

  const auto project_snapshot = m_project;
  const auto trajectory_snapshot = traj_it->second;

  std::thread([this, operation_id, trajectory_uuid, project_snapshot,
               trajectory_snapshot]() {
    const auto work_dir = std::filesystem::temp_directory_path() /
                          "choreo-state-server" / operation_id;
    std::error_code fs_err;
    std::filesystem::create_directories(work_dir, fs_err);

    const auto project_file = work_dir / "project.chor";
    const auto trajectory_file = work_dir / "trajectory.traj";
    const auto output_file = work_dir / "output.traj";

    {
      std::ofstream project_out(project_file);
      project_out << wpi::util::json(project_snapshot).to_string_pretty();
    }
    {
      std::ofstream trajectory_out(trajectory_file);
      trajectory_out << wpi::util::json(trajectory_snapshot).to_string_pretty();
    }

    const auto generator_exe = ResolveGeneratorExecutable();
    if (!generator_exe.has_value()) {
      m_loop_runner.ExecSync([this, operation_id](wpi::net::uv::Loop&) {
        const auto op = m_operations.find(operation_id);
        if (op == m_operations.end()) {
          return;
        }
        op->second.state = "failed";
        op->second.completion_status = "failed";
        op->second.error_message = "generator executable not found";
        op->second.updated_at = NowIso8601Utc();
      });
      return;
    }

    m_loop_runner.ExecSync(
        [this, operation_id, trajectory_uuid, generator_exe = *generator_exe,
         project_file, trajectory_file,
         output_file](wpi::net::uv::Loop& loop) {
          const auto op = m_operations.find(operation_id);
          if (op == m_operations.end()) {
            return;
          }
          if (op->second.state == "queued") {
            op->second.state = "running";
            op->second.updated_at = NowIso8601Utc();
          }

          const std::string progress_url = std::format(
              "ws://127.0.0.1:{}/progress/{}", m_options.internal_progress_port,
              operation_id);

          auto proc = wpi::net::uv::Process::Spawn(
              loop, generator_exe.string(),
              wpi::net::uv::Process::Option("generator"),
              wpi::net::uv::Process::Option("--chor"),
              wpi::net::uv::Process::Option(project_file.string()),
              wpi::net::uv::Process::Option("--trajectory"),
              wpi::net::uv::Process::Option(trajectory_file.string()),
              wpi::net::uv::Process::Option("--output"),
              wpi::net::uv::Process::Option(output_file.string()),
              wpi::net::uv::Process::Option("--progress-url"),
              wpi::net::uv::Process::Option(progress_url),
              wpi::net::uv::Process::StdioIgnore(0),
              wpi::net::uv::Process::StdioIgnore(1),
              wpi::net::uv::Process::StdioIgnore(2));

          if (!proc) {
            op->second.state = "failed";
            op->second.completion_status = "failed";
            op->second.error_message = "failed to spawn generator process";
            op->second.updated_at = NowIso8601Utc();
            return;
          }

          m_running_generation_processes[operation_id] = proc;

          proc->exited.connect(
              [this, operation_id, trajectory_uuid,
               output_file](int64_t status, int signal) {
                auto op = m_operations.find(operation_id);
                if (op == m_operations.end()) {
                  return;
                }

                m_running_generation_processes.erase(operation_id);

                if (op->second.state == "cancelled") {
                  op->second.updated_at = NowIso8601Utc();
                  return;
                }

                std::optional<TrajectoryFile> output_trajectory;
                try {
                  if (std::filesystem::exists(output_file)) {
                    std::ifstream in(output_file);
                    const std::string contents{
                        std::istreambuf_iterator<char>(in),
                        std::istreambuf_iterator<char>()};
                    output_trajectory = TrajectoryFile::fromJson(
                        wpi::util::json::parse_or_throw(
                            std::string_view{contents}));
                  }
                } catch (...) {
                  output_trajectory = std::nullopt;
                }

                if (output_trajectory.has_value() && op->second.state != "completed") {
                  auto updated = *output_trajectory;
                  updated.uuid = trajectory_uuid;
                  m_trajectories[trajectory_uuid] = std::move(updated);
                  ++m_trajectory_revisions[trajectory_uuid];
                  op->second.state = "completed";
                  op->second.completion_status = "completed";
                  op->second.result_revision =
                      TrajectoryRevisionToken(trajectory_uuid);
                  op->second.error_message = std::nullopt;
                  op->second.updated_at = NowIso8601Utc();
                  PersistStateSnapshot();
                } else if (status != 0 && op->second.state != "completed") {
                  op->second.state = "failed";
                  op->second.completion_status = "failed";
                  op->second.error_message = std::format(
                      "generator exited with status {} signal {}", status,
                      signal);
                  op->second.updated_at = NowIso8601Utc();
                }
              });
        });
  }).detach();
}

void ApiServer::PersistStateSnapshot() const {
  const auto root = std::filesystem::temp_directory_path() /
                    "choreo-state-server" / "persisted-state";
  std::error_code ec;
  std::filesystem::create_directories(root, ec);
  if (ec) {
    return;
  }

  {
    std::ofstream project_out(root / "project.chor");
    project_out << wpi::util::json(m_project).to_string_pretty();
  }

  const auto traj_root = root / "trajectories";
  std::filesystem::create_directories(traj_root, ec);
  if (ec) {
    return;
  }
  for (const auto& [uuid, traj] : m_trajectories) {
    std::ofstream traj_out(traj_root / (uuid + ".traj"));
    traj_out << wpi::util::json(traj).to_string_pretty();
  }
}

}  // namespace choreo::state_server