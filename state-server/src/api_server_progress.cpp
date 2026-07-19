#include <charconv>
#include <chrono>
#include <cstdio>
#include <iostream>
#include <memory>

#include <wpi/net/HttpWebSocketServerConnection.hpp>
#include <wpi/net/UrlParser.hpp>
#include <wpi/util/json.hpp>

#include "choreo/state_server/api_server.hpp"

namespace choreo::state_server {

namespace {

std::optional<uint64_t> ParseOperationId(std::string_view value) {
  uint64_t parsed_value = 0;
  const auto* begin = value.data();
  const auto* end = begin + value.size();
  const auto [ptr, ec] = std::from_chars(begin, end, parsed_value);
  if (ec != std::errc{} || ptr != end) {
    return std::nullopt;
  }
  return parsed_value;
}

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

    const auto path = parser.GetPath();
    // /progress is subscriber egress; /progress/{operationId} is producer ingress.
    return path == "/progress" || path.starts_with("/progress/");
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
    // Subscriber clients receive wrapped rebroadcast frames for all operations.
    if (path == "/progress") {
      m_owner.RegisterProgressSubscriber(ws);
      return;
    }

    constexpr std::string_view prefix = "/progress/";
    if (!path.starts_with(prefix) || path.size() <= prefix.size()) {
      ws->Close(1008, "invalid progress path");
      return;
    }

    const auto operation_id = ParseOperationId(path.substr(prefix.size()));
    if (!operation_id.has_value()) {
      ws->Close(1008, "invalid operation id");
      return;
    }

    // Producer clients push progress frames for exactly one operation ID.
    ws->text.connect(
        [this, operation_id = *operation_id](std::string_view data, bool) {
          m_owner.HandleGeneratorProgressEvent(operation_id, data);
        });
  }

 private:
  ApiServer& m_owner;
};

}  // namespace

void ApiServer::AcceptProgressClient() {
  auto client = m_progress_server->Accept();
  if (!client) {
    std::fprintf(stderr, "state-server: failed to accept progress client\n");
    return;
  }

  client->error.connect(
      [ptr = client.get()](wpi::net::uv::Error) { ptr->Close(); });

  auto handler = std::make_shared<ProgressRelayConnection>(client, *this);
  client->SetData(handler);
  m_progress_connections.push_back(ConnectionHandle{client, handler});
}

void ApiServer::HandleGeneratorProgressEvent(uint64_t operation_id,
                                             std::string_view frame) {
  BroadcastProgressFrame(operation_id, frame);

  const auto op_it = m_operations.find(operation_id);
  if (op_it == m_operations.end()) {
    return;
  }

  op_it->second.last_progress_event = std::string(frame);
  op_it->second.timestamps.updated_at = std::chrono::system_clock::now();
  std::cout << "progress frame: operation=" << operation_id
            << " size=" << frame.size() << "\n";

  try {
    auto parsed = wpi::util::json::parse_or_throw(frame);
    if (!parsed.is_object() || !parsed.contains("event") ||
        !parsed.at("event").is_string()) {
      return;
    }

    const std::string event_name = parsed.at("event").get_string();
    if (event_name == "error") {
      std::string error_message = "generation_error";
      if (parsed.contains("payload") && parsed.at("payload").is_object() &&
          parsed.at("payload").contains("message") &&
          parsed.at("payload").at("message").is_string()) {
        error_message = parsed.at("payload").at("message").get_string();
      }
        std::cout << "generation operation " << operation_id
              << " marked failed from progress event: " << error_message
              << "\n";
      op_it->second.markFailed(std::move(error_message));
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
      op_it->second.markComplete(
          TrajectoryRevisionToken(op_it->second.trajectory_uuid));
      op_it->second.error_message = std::nullopt;
      std::cout << "generation operation " << operation_id
                << " marked complete from progress event revision="
                << TrajectoryRevisionToken(op_it->second.trajectory_uuid)
                << "\n";
      PersistStateSnapshot();
      return;
    }

    if (op_it->second.state == OperationState::kQueued) {
      op_it->second.markStarted();
    }
  } catch (...) {
    std::cout << "progress frame parse ignored: operation=" << operation_id
              << "\n";
  }
}

void ApiServer::RegisterProgressSubscriber(
    const std::shared_ptr<wpi::net::WebSocket>& ws) {
  m_progress_subscribers.emplace_back(ws);
}

void ApiServer::BroadcastProgressFrame(uint64_t operation_id,
                                       std::string_view frame) {
  wpi::util::json wrapped = wpi::util::json::object();
  wrapped["operationId"] = operation_id;
  try {
    wrapped["frame"] = wpi::util::json::parse_or_throw(frame);
  } catch (...) {
    return;
  }

  auto payload = std::make_shared<std::string>(wrapped.to_string());
  for (auto it = m_progress_subscribers.begin();
       it != m_progress_subscribers.end();) {
    auto subscriber = it->lock();
    if (!subscriber) {
      it = m_progress_subscribers.erase(it);
      continue;
    }

    subscriber->SendText({{*payload}}, [payload](auto, wpi::net::uv::Error) {});
    ++it;
  }
}

}  // namespace choreo::state_server