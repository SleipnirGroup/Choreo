#include <charconv>
#include <csignal>
#include <cstdio>
#include <filesystem>
#include <format>
#include <fstream>
#include <iostream>
#include <memory>
#include <thread>

#include <wpi/util/json.hpp>

#include "api_server_internal.hpp"
#include "choreo/rest_router/router.hpp"
#include "choreo/state_server/api_server.hpp"


namespace choreo::state_server {

namespace {

using choreo::rest_router::HttpMethod;
using choreo::rest_router::Request;
using choreo::rest_router::Response;
using choreo::rest_router::RouteParams;
using namespace choreo::state_server::detail;

std::optional<OperationId> ParseOperationId(std::string_view value) {
  OperationId parsed_value = 0;
  const auto* begin = value.data();
  const auto* end = begin + value.size();
  const auto [ptr, ec] = std::from_chars(begin, end, parsed_value);
  if (ec != std::errc{} || ptr != end) {
    return std::nullopt;
  }
  return parsed_value;
}

}  // namespace
std::expected<std::string, Response> ApiServer::CheckRouteTrajectoryUUID(
  const Request& request, const RouteParams& params, std::string key) {
  const auto trajectory_uuid = FindRouteParam(params, key);
  if (!trajectory_uuid.has_value()) {
    return std::unexpected(BadRoute("Missing trajectory UUID parameter"));
  }
  const auto& trajectory_uuid_value = trajectory_uuid->get();

  if (!FindMappedValue(m_trajectories, trajectory_uuid_value)) {
    return std::unexpected(NotFound("Trajectory not found"));
  }
  // Extract and validate the current revision of the trajectory, check if
  // the request is against the current revision.
  const auto current_revision =
      TrajectoryRevisionToken(trajectory_uuid_value);
  if (auto error =
          ValidateIfMatchPrecondition(request, current_revision)) {
    return std::unexpected(*error);
  }
  return trajectory_uuid_value;
}
std::expected<OperationId, rest_router::Response> ApiServer::CheckRouteOperationId(
    const rest_router::RouteParams& params, std::string key) {
  const auto operation_id = FindRouteParam(params, key);
  if (!operation_id.has_value()) {
    return std::unexpected(BadRoute("Missing operationId parameter"));
  }

  const auto operation_id_value = ParseOperationId(operation_id->get());
  if (!operation_id_value.has_value()) {
    return std::unexpected(BadRoute("Invalid operationId parameter"));
  }

  return *operation_id_value;
}

void ApiServer::RegisterGenerationRoutes() {
  // Route: Start asynchronous trajectory generation.
  // Preconditions: trajectory must exist and If-Match must match its current
  // ETag. Body: optional JSON object for generation options. Response: 202 with
  // { operationId, state } and background generator launch.
  m_router.Register(
      HttpMethod::kPost, "/api/v1/trajectories/{uuid}/generate",
      [this](const Request& request, const RouteParams& params) -> Response {
        // Extract and validate the trajectory UUID from the route parameters.
        auto trajectory_uuid_result = CheckRouteTrajectoryUUID(request, params);
        if (!trajectory_uuid_result.has_value()) {
          return trajectory_uuid_result.error();
        }
        const std::string& trajectory_uuid_value = trajectory_uuid_result.value();



        // Parse and validate the request body for generation options.
        try {
          if (!request.body.empty()) {
            auto body =
                wpi::util::json::parse_or_throw(std::string_view{request.body});
            if (!body.is_object()) {
              return InvalidJson("Request body must be a JSON object");
            }
          }
        } catch (const std::exception& ex) {
          return InvalidJson(ex.what());
        }

        // Create a new operation record for this generation request.
        OperationId operation_id = generateNextOperationId();
        OperationRecord record(trajectory_uuid_value);
        record.markQueued();
        m_latest_operation_by_trajectory[trajectory_uuid_value] = operation_id;
        m_operations.insert_or_assign(operation_id, std::move(record));

        LaunchGenerationProcess(operation_id, trajectory_uuid_value);

        wpi::util::json body = wpi::util::json::object();
        body["operationId"] = operation_id;
        body["state"] = record.state;
        return JsonResponse(202, body);
      });

  // Route: Fetch generation status for a trajectory.
  // Preconditions: trajectory must exist.
  // Body: none.
  // Response: 200 with { trajectoryUuid, queuePosition, latestOperationId,
  // lastCompletionStatus }.
  m_router.Register(
      HttpMethod::kGet, "/api/v1/trajectories/{uuid}/generation-state",
      [this](const Request& request, const RouteParams& params) -> Response {
auto trajectory_uuid_result = CheckRouteTrajectoryUUID(request, params);
        if (!trajectory_uuid_result.has_value()) {
          std::cout << "generation-state rejected: "
                    << request.path << " status="
                    << trajectory_uuid_result.error().status << "\n";
          return trajectory_uuid_result.error();
        }
        const std::string& trajectory_uuid_value = trajectory_uuid_result.value();

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
          if (op_it != m_operations.end()) {
            if (op_it->second.state == OperationState::kCompleted) {
              body["lastCompletionStatus"] = "success";
            } else if (op_it->second.state == OperationState::kFailed) {
              body["lastCompletionStatus"] = "failed";
            } else if (op_it->second.state == OperationState::kCancelled) {
              body["lastCompletionStatus"] = "cancelled";
            }
          }
        }

            std::cout << "generation-state: trajectory=" << trajectory_uuid_value
                << " latestOperationId="
                << (body["latestOperationId"].is_null()
                  ? std::string("null")
                  : body["latestOperationId"].to_string())
                << " lastCompletionStatus="
                << (body["lastCompletionStatus"].is_null()
                  ? std::string("null")
                  : body["lastCompletionStatus"].to_string())
                << "\n";

        return JsonResponse(200, body);
      });

  // Route: Cancel all active generation work.
  // Preconditions: none.
  // Body: none. Response: 202 with { operationId, state, cancelledCount }.
  m_router.Register(HttpMethod::kPost, "/api/v1/generate/cancel-all",
                    [this](const Request&, const RouteParams&) -> Response {
                      int cancelled_count = 0;
                      std::optional<OperationId> response_operation_id;
                      for (auto& [operation_id, op] : m_operations) {
                        if (op.state == OperationState::kQueued ||
                            op.state == OperationState::kRunning) {
                          if (auto proc_it =
                                  m_running_generation_processes.find(operation_id);
                              proc_it != m_running_generation_processes.end() &&
                              proc_it->second) {
                            proc_it->second->Kill(SIGTERM);
                          }
                          op.markCancelled();
                          ++cancelled_count;
                          response_operation_id = operation_id;
                        }
                      }

                      wpi::util::json body = wpi::util::json::object();
                      if (response_operation_id.has_value()) {
                        body["operationId"] = *response_operation_id;
                      } else {
                        body["operationId"] = nullptr;
                      }
                      body["state"] = "completed";
                      body["cancelledCount"] = cancelled_count;
                      return JsonResponse(202, body);
                    });

  // Route: Fetch detailed operation state.
  // Preconditions: operationId must exist.
  // Body: none.
  // Response: 200 with operation timing, status, error, revision, and last
  // relayed progress frame.
  m_router.Register(
      HttpMethod::kGet, "/api/v1/operations/{operationId}",
      [this](const Request&, const RouteParams& params) -> Response {
        auto operation_id_result = CheckRouteOperationId(params);
        if (!operation_id_result.has_value()) {
          return operation_id_result.error();
        }
        const auto operation_id_value = *operation_id_result;

        const auto operation =
            FindMappedValue(m_operations, operation_id_value);
        if (!operation.has_value()) {
          return NotFound("Operation not found");
        }
        const auto& operation_value = operation->get();

        wpi::util::json body = operation_value;

        return JsonResponse(200, body);
      });

  // Route: Cancel a specific operation.
  // Preconditions: operationId must exist and must not already be terminal.
  // Body: none.
  // Response: 202 with { operationId, state } after cancellation is requested.
  m_router.Register(
      HttpMethod::kPost, "/api/v1/operations/{operationId}/cancel",
      [this](const Request&, const RouteParams& params) -> Response {
        auto operation_id_result = CheckRouteOperationId(params);
        if (!operation_id_result.has_value()) {
          return operation_id_result.error();
        }
        const auto operation_id_value = *operation_id_result;

        auto operation = FindMappedValue(m_operations, operation_id_value);
        if (!operation.has_value()) {
          return NotFound("Operation not found");
        }
        auto& operation_value = operation->get();

        if (operation_value.isDone()) {
          return Conflict("operation_terminal",
                          "Operation already reached a terminal state");
        }

        operation_value.markCancelled();
        if (auto proc_it =
                m_running_generation_processes.find(operation_id_value);
            proc_it != m_running_generation_processes.end() &&
            proc_it->second) {
          proc_it->second->Kill(SIGTERM);
        }

        wpi::util::json body = wpi::util::json::object();
        body["operationId"] = operation_id_value;
        body["state"] = operation_value.state;
        return JsonResponse(202, body);
      });

  // Route: Fetch lightweight server diagnostics.
  // Preconditions: none.
  // Body: none.
  // Response: 200 with queue depth, active operation count, ws client count,
  // and related metrics.
  m_router.Register(HttpMethod::kGet, "/api/v1/diagnostics",
                    [this](const Request&, const RouteParams&) {
                      int queue_depth = 0;
                      int active_operations = 0;
                      for (const auto& [_, op] : m_operations) {
                        if (op.state == OperationState::kQueued) {
                          ++queue_depth;
                        }
                        if (op.state == OperationState::kQueued ||
                            op.state == OperationState::kRunning) {
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

std::optional<std::filesystem::path> ApiServer::ResolveGeneratorExecutable()
    const {
  const auto cwd = std::filesystem::current_path();
  const auto parent = cwd.parent_path();

  const std::vector<std::filesystem::path> candidates = {
      // Running from repository root.
      cwd / "build" / "generator.exe",
      cwd / "build" / "generator" / "generator.exe",
      cwd / "build" / "Debug" / "generator.exe",
      cwd / "build" / "generator" / "Debug" / "generator.exe",
      // Running from build/state-server.
      parent / "generator.exe",
      parent / "generator" / "generator.exe",
      parent / "Debug" / "generator.exe",
      parent / "generator" / "Debug" / "generator.exe",
  };

  for (const auto& candidate : candidates) {
    if (std::filesystem::exists(candidate)) {
      return candidate;
    }
  }
  return std::nullopt;
}

void ApiServer::LaunchGenerationProcess(uint64_t operation_id,
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
                          "choreo-state-server" /
                          std::to_string(operation_id);
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
        std::cout << "generation operation " << operation_id
                  << " failed: generator executable not found\n";
        op->second.markFailed("generator executable not found");
      });
      return;
    }

    m_loop_runner.ExecSync([this, operation_id, trajectory_uuid,
                            generator_exe = *generator_exe, project_file,
                            trajectory_file,
                            output_file](wpi::net::uv::Loop& loop) {
      const auto op = m_operations.find(operation_id);
      if (op == m_operations.end()) {
        return;
      }
      if (op->second.state == OperationState::kQueued) {
        op->second.markStarted();
      }

      const std::string progress_url =
          std::format("ws://127.0.0.1:{}/progress/{}",
                      m_options.internal_progress_port, operation_id);

      auto stdout_pipe = wpi::net::uv::Pipe::Create(loop);
      auto stderr_pipe = wpi::net::uv::Pipe::Create(loop);
      if (!stdout_pipe || !stderr_pipe) {
        std::cout << "generation operation " << operation_id
                  << " failed: unable to create stdio pipes\n";
        op->second.markFailed("failed to create generator stdio pipes");
        return;
      }

      stdout_pipe->data.connect([operation_id](wpi::net::uv::Buffer& buf,
                                               size_t size) {
        if (size == 0) {
          return;
        }
        std::cout << "[generator stdout op=" << operation_id << "] ";
        std::cout.write(buf.base, size);
        std::cout.flush();
      });
      stderr_pipe->data.connect([operation_id](wpi::net::uv::Buffer& buf,
                                               size_t size) {
        if (size == 0) {
          return;
        }
        std::cerr << "[generator stderr op=" << operation_id << "] ";
        std::cerr.write(buf.base, size);
        std::cerr.flush();
      });
      stdout_pipe->StartRead();
      stderr_pipe->StartRead();

      std::cout << "Spawning generator process with progress URL: " << progress_url << "\n";
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
          wpi::net::uv::Process::StdioCreatePipe(1, *stdout_pipe,
                                                 UV_WRITABLE_PIPE),
          wpi::net::uv::Process::StdioCreatePipe(2, *stderr_pipe,
                                                 UV_WRITABLE_PIPE));

      if (!proc) {
        std::cout << "generation operation " << operation_id
                  << " failed: process spawn returned null\n";
        op->second.markFailed("failed to spawn generator process");
        stdout_pipe->Close();
        stderr_pipe->Close();
        return;
      }

      m_running_generation_processes[operation_id] = proc;
      m_running_generation_stdout_pipes[operation_id] = stdout_pipe;
      m_running_generation_stderr_pipes[operation_id] = stderr_pipe;

      proc->exited.connect([this, operation_id, trajectory_uuid, output_file](
                               int64_t status, int signal) {
        auto op = m_operations.find(operation_id);
        if (op == m_operations.end()) {
          return;
        }

        m_running_generation_processes.erase(operation_id);
        if (auto out_it = m_running_generation_stdout_pipes.find(operation_id);
            out_it != m_running_generation_stdout_pipes.end()) {
          if (out_it->second) {
            out_it->second->Close();
          }
          m_running_generation_stdout_pipes.erase(out_it);
        }
        if (auto err_it = m_running_generation_stderr_pipes.find(operation_id);
            err_it != m_running_generation_stderr_pipes.end()) {
          if (err_it->second) {
            err_it->second->Close();
          }
          m_running_generation_stderr_pipes.erase(err_it);
        }

        if (op->second.state == OperationState::kCancelled) {
          std::cout << "generation operation " << operation_id
                    << " exited after cancellation status=" << status
                    << " signal=" << signal << "\n";
          return;
        }

        std::optional<TrajectoryFile> output_trajectory;
        try {
          if (std::filesystem::exists(output_file)) {
            std::ifstream in(output_file);
            const std::string contents{std::istreambuf_iterator<char>(in),
                                       std::istreambuf_iterator<char>()};
            output_trajectory = TrajectoryFile::fromJson(
                wpi::util::json::parse_or_throw(std::string_view{contents}));
          }
        } catch (...) {
          output_trajectory = std::nullopt;
        }

        if (output_trajectory.has_value() &&
            op->second.state != OperationState::kCompleted) {
          auto updated = *output_trajectory;
          updated.uuid = trajectory_uuid;
          m_trajectories[trajectory_uuid] = std::move(updated);
          ++m_trajectory_revisions[trajectory_uuid];
          op->second.markComplete(TrajectoryRevisionToken(trajectory_uuid));
          op->second.error_message = std::nullopt;
          std::cout << "generation operation " << operation_id
                    << " completed from output file revision="
                    << TrajectoryRevisionToken(trajectory_uuid)
                    << " status=" << status << " signal=" << signal
                    << "\n";
          PersistStateSnapshot();
        } else if (status != 0 &&
                   op->second.state != OperationState::kCompleted) {
          std::cout << "generation operation " << operation_id
                    << " failed from exit status=" << status
                    << " signal=" << signal << "\n";
          op->second.markFailed(std::format(
              "generator exited with status {} signal {}", status, signal));
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