#include "choreo/state_server/api_server.hpp"

#include <array>
#include <cstdio>
#include <fstream>
#include <format>
#include <memory>
#include <random>
#include <utility>

#include <wpi/util/json.hpp>

#include "api_server_internal.hpp"
#include "choreo/rest_router/http_server_connection.hpp"

namespace choreo::state_server {

namespace {

class ServerHttpConnection final : public choreo::rest_router::HttpRouterConnection {
 public:
  ServerHttpConnection(std::shared_ptr<wpi::net::uv::Stream> stream,
                       const choreo::rest_router::Router& router)
      : HttpRouterConnection(std::move(stream), router) {}
};

}  // namespace

ApiServer::ApiServer(ServerOptions options) : m_options(std::move(options)) {
  RegisterRoutes();
}

bool ApiServer::Start() {
  bool ok = true;
  m_started_at = std::chrono::steady_clock::now();

  if (!LoadInitialStateFromWorkspace()) {
    return false;
  }

  m_loop_runner.ExecSync([this, &ok](wpi::net::uv::Loop& loop) {
    m_server = wpi::net::uv::Tcp::Create(loop);
    if (!m_server) {
      std::fprintf(stderr, "state-server: failed to create TCP server\n");
      ok = false;
      return;
    }

    m_server->error.connect([](wpi::net::uv::Error err) {
      std::fprintf(stderr, "state-server: server error: %s\n",
                   std::string(err.str()).c_str());
    });

    m_server->Bind(m_options.bind_address, m_options.http_port);
    m_server->Listen([this] { AcceptClient(); });

    m_progress_server = wpi::net::uv::Tcp::Create(loop);
    if (!m_progress_server) {
      std::fprintf(stderr,
                   "state-server: failed to create progress relay TCP server\n");
      ok = false;
      return;
    }

    m_progress_server->error.connect([](wpi::net::uv::Error err) {
      std::fprintf(stderr, "state-server: progress relay server error: %s\n",
                   std::string(err.str()).c_str());
    });
    m_progress_server->Bind("127.0.0.1", m_options.internal_progress_port);
    m_progress_server->Listen([this] { AcceptProgressClient(); });
  });

  return ok;
}

bool ApiServer::LoadInitialStateFromWorkspace() {
  if (m_options.workspace_dir.empty()) {
    std::fprintf(stderr,
                 "state-server: workspace directory is required (must contain one .chor)\n");
    return false;
  }

  std::error_code ec;
  if (!std::filesystem::exists(m_options.workspace_dir, ec) ||
      !std::filesystem::is_directory(m_options.workspace_dir, ec)) {
    std::fprintf(stderr,
                 "state-server: workspace directory not found or not a directory: %s\n",
                 m_options.workspace_dir.string().c_str());
    return false;
  }

  std::vector<std::filesystem::path> project_files;
  std::vector<std::filesystem::path> trajectory_files;
  for (const auto& entry :
       std::filesystem::directory_iterator(m_options.workspace_dir, ec)) {
    if (ec || !entry.is_regular_file()) {
      continue;
    }

    const auto ext = entry.path().extension().string();
    if (ext == ".chor") {
      project_files.push_back(entry.path());
    } else if (ext == ".traj") {
      trajectory_files.push_back(entry.path());
    }
  }

  if (project_files.size() != 1) {
    std::fprintf(stderr,
                 "state-server: workspace must contain exactly one .chor file, found %zu\n",
                 project_files.size());
    return false;
  }

  try {
    {
      std::ifstream in(project_files[0]);
      const std::string contents{std::istreambuf_iterator<char>(in),
                                 std::istreambuf_iterator<char>()};
      auto parsed = wpi::util::json::parse_or_throw(std::string_view{contents});
      m_project = ProjectFile::fromJson(parsed);
      EnsureUuid(m_project.uuid);
      m_project_revision = 1;
    }

    m_trajectories.clear();
    m_trajectory_revisions.clear();
    for (const auto& traj_path : trajectory_files) {
      std::ifstream in(traj_path);
      const std::string contents{std::istreambuf_iterator<char>(in),
                                 std::istreambuf_iterator<char>()};
      auto parsed = wpi::util::json::parse_or_throw(std::string_view{contents});
      auto traj = TrajectoryFile::fromJson(parsed);
      EnsureUuid(traj.uuid);
      m_trajectory_revisions[traj.uuid] = 1;
      m_trajectories[traj.uuid] = std::move(traj);
    }
  } catch (const std::exception& ex) {
    std::fprintf(stderr,
                 "state-server: failed loading workspace documents: %s\n",
                 ex.what());
    return false;
  }

  return true;
}

void ApiServer::Stop() {
  m_loop_runner.ExecSync([this](wpi::net::uv::Loop&) {
    for (auto& conn : m_connections) {
      if (conn.stream) {
        conn.stream->Close();
      }
    }
    m_connections.clear();

    if (m_server) {
      m_server->Close();
      m_server.reset();
    }

    for (auto& conn : m_progress_connections) {
      if (conn.stream) {
        conn.stream->Close();
      }
    }
    m_progress_connections.clear();

    if (m_progress_server) {
      m_progress_server->Close();
      m_progress_server.reset();
    }
  });
}

void ApiServer::RegisterRoutes() {
  RegisterDocumentRoutes();
  RegisterGenerationRoutes();
}

void ApiServer::AcceptClient() {
  auto client = m_server->Accept();
  if (!client) {
    std::fprintf(stderr, "state-server: failed to accept client\n");
    return;
  }

  client->error.connect([ptr = client.get()](wpi::net::uv::Error) { ptr->Close(); });

  auto handler = std::make_shared<ServerHttpConnection>(client, m_router);
  client->SetData(handler);
  m_connections.push_back(ConnectionHandle{client, handler});
}

void ApiServer::EnsureUuid(std::string& value) {
  if (value.empty()) {
    value = GenerateUuid();
  }
}

std::string ApiServer::GenerateUuid() {
  static std::random_device rd;
  static std::mt19937_64 gen(rd());
  std::uniform_int_distribution<uint32_t> dis(0, 15);

  const auto hex = [&]() -> char {
    static constexpr std::array<char, 16> chars{
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};
    return chars[dis(gen)];
  };

  std::string uuid;
  uuid.reserve(36);
  for (int i = 0; i < 36; ++i) {
    if (i == 8 || i == 13 || i == 18 || i == 23) {
      uuid.push_back('-');
      continue;
    }
    uuid.push_back(hex());
  }
  uuid[14] = '4';
  uuid[19] = "89ab"[dis(gen) % 4];
  return uuid;
}

std::string ApiServer::ProjectRevisionToken() const {
  return std::format("project-{}", m_project_revision);
}

std::string ApiServer::TrajectoryRevisionToken(const std::string& uuid) const {
  const auto it = m_trajectory_revisions.find(uuid);
  const uint64_t rev = it != m_trajectory_revisions.end() ? it->second : 0;
  return std::format("traj-{}-{}", uuid, rev);
}

std::string ApiServer::ProjectScopeKey() const {
  return "project";
}

std::string ApiServer::TrajectoryScopeKey(std::string_view uuid) const {
  return std::format("trajectory:{}", uuid);
}

std::optional<wpi::util::json> ApiServer::CaptureScopeSnapshot(
    std::string_view scope_key) const {
  if (scope_key == ProjectScopeKey()) {
    return wpi::util::json(m_project);
  }

  constexpr std::string_view kTrajectoryPrefix = "trajectory:";
  if (!scope_key.starts_with(kTrajectoryPrefix)) {
    return std::nullopt;
  }

  const std::string uuid(scope_key.substr(kTrajectoryPrefix.size()));
  const auto it = m_trajectories.find(uuid);
  if (it == m_trajectories.end()) {
    return wpi::util::json(nullptr);
  }
  return wpi::util::json(it->second);
}

bool ApiServer::ApplyScopeSnapshot(std::string_view scope_key,
                                   const wpi::util::json& snapshot,
                                   std::string& error_message) {
  if (scope_key == ProjectScopeKey()) {
    if (!snapshot.is_object()) {
      error_message = "project snapshot must be an object";
      return false;
    }

    try {
      auto updated = ProjectFile::fromJson(snapshot);
      EnsureUuid(updated.uuid);
      m_project = std::move(updated);
      return true;
    } catch (const std::exception& ex) {
      error_message = ex.what();
      return false;
    }
  }

  constexpr std::string_view kTrajectoryPrefix = "trajectory:";
  if (!scope_key.starts_with(kTrajectoryPrefix)) {
    error_message = "unknown history scope";
    return false;
  }

  const std::string uuid(scope_key.substr(kTrajectoryPrefix.size()));
  if (snapshot.is_null()) {
    m_trajectories.erase(uuid);
    return true;
  }

  if (!snapshot.is_object()) {
    error_message = "trajectory snapshot must be an object or null";
    return false;
  }

  try {
    auto updated = TrajectoryFile::fromJson(snapshot);
    updated.uuid = uuid;
    EnsureUuid(updated.uuid);
    m_trajectories[uuid] = std::move(updated);
    return true;
  } catch (const std::exception& ex) {
    error_message = ex.what();
    return false;
  }
}

bool ApiServer::BumpScopeRevision(std::string_view scope_key) {
  if (scope_key == ProjectScopeKey()) {
    ++m_project_revision;
    return true;
  }

  constexpr std::string_view kTrajectoryPrefix = "trajectory:";
  if (!scope_key.starts_with(kTrajectoryPrefix)) {
    return false;
  }

  const std::string uuid(scope_key.substr(kTrajectoryPrefix.size()));
  ++m_trajectory_revisions[uuid];
  return true;
}

std::optional<std::string> ApiServer::CurrentScopeRevisionToken(
    std::string_view scope_key) const {
  if (scope_key == ProjectScopeKey()) {
    return ProjectRevisionToken();
  }

  constexpr std::string_view kTrajectoryPrefix = "trajectory:";
  if (!scope_key.starts_with(kTrajectoryPrefix)) {
    return std::nullopt;
  }

  const std::string uuid(scope_key.substr(kTrajectoryPrefix.size()));
  return TrajectoryRevisionToken(uuid);
}

std::optional<rest_router::Response> ApiServer::HandleUndo(
    std::string_view scope_key) {
  auto entry = m_history.Undo(scope_key);
  if (!entry.has_value()) {
    return detail::ErrorResponse(409, "no_undo_available",
                                 "No undo entry available for this scope");
  }

  const auto current = CaptureScopeSnapshot(scope_key);
  if (!current.has_value()) {
    return detail::ErrorResponse(422, "invalid_history_scope",
                                 "Unknown history scope");
  }

  auto target = *current;
  std::string error;
  if (!ApplyJsonPatch(target, entry->undo_patch, error)) {
    return detail::ErrorResponse(422, "invalid_history_patch", error);
  }
  if (!ApplyScopeSnapshot(scope_key, target, error)) {
    return detail::ErrorResponse(422, "invalid_history_snapshot", error);
  }
  if (!BumpScopeRevision(scope_key)) {
    return detail::ErrorResponse(422, "invalid_history_scope",
                                 "Failed to bump revision for history scope");
  }
  return std::nullopt;
}

std::optional<rest_router::Response> ApiServer::HandleRedo(
    std::string_view scope_key) {
  auto entry = m_history.Redo(scope_key);
  if (!entry.has_value()) {
    return detail::ErrorResponse(409, "no_redo_available",
                                 "No redo entry available for this scope");
  }

  const auto current = CaptureScopeSnapshot(scope_key);
  if (!current.has_value()) {
    return detail::ErrorResponse(422, "invalid_history_scope",
                                 "Unknown history scope");
  }

  auto target = *current;
  std::string error;
  if (!ApplyJsonPatch(target, entry->redo_patch, error)) {
    return detail::ErrorResponse(422, "invalid_history_patch", error);
  }
  if (!ApplyScopeSnapshot(scope_key, target, error)) {
    return detail::ErrorResponse(422, "invalid_history_snapshot", error);
  }
  if (!BumpScopeRevision(scope_key)) {
    return detail::ErrorResponse(422, "invalid_history_scope",
                                 "Failed to bump revision for history scope");
  }
  return std::nullopt;
}

}  // namespace choreo::state_server
