#include "choreo/state_server/api_server.hpp"

#include <array>
#include <cstdio>
#include <format>
#include <memory>
#include <random>
#include <utility>

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
  m_project = ProjectFile{};
  EnsureUuid(m_project.uuid);
  m_project.name = "New Project";
  m_project.version = 4;
  m_project.type = DriveType::Swerve;

  auto traj = TrajectoryFile{};
  traj.name = "Example Trajectory";
  traj.version = 4;
  traj.snapshot = std::nullopt;
  traj.trajectory = std::nullopt;
  traj.events.clear();
  EnsureUuid(traj.uuid);
  m_trajectories.emplace(traj.uuid, traj);
  m_trajectory_revisions[traj.uuid] = 1;

  RegisterRoutes();
}

bool ApiServer::Start() {
  bool ok = true;
  m_started_at = std::chrono::steady_clock::now();

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

}  // namespace choreo::state_server
