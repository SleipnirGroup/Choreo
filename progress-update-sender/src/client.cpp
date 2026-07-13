#include "progress_update_sender/client.hpp"

#include <chrono>
#include <cstdint>
#include <condition_variable>
#include <cstdio>
#include <cstdlib>
#include <mutex>
#include <optional>
#include <string>
#include <string_view>

#include "wpi/net/EventLoopRunner.hpp"
#include "wpi/net/uv/Buffer.hpp"
#include "wpi/net/uv/Tcp.hpp"
#include "wpi/net/uv/util.hpp"

namespace choreo::progress_update_sender {

namespace {
using namespace std::chrono_literals;

constexpr auto kConnectTimeout = 2s;

struct ParsedUrl {
  std::string host;
  std::string uri;
  std::string host_header;
  uint16_t port;
};

std::optional<ParsedUrl> parse_ws_url(std::string_view url) {
  constexpr std::string_view prefix = "ws://";
  if (!url.starts_with(prefix)) {
    return std::nullopt;
  }

  const auto rest = url.substr(prefix.size());
  if (rest.empty()) {
    return std::nullopt;
  }

  auto slash = rest.find('/');
  const auto authority = rest.substr(0, slash);
  std::string uri = slash == std::string_view::npos
                        ? "/"
                        : std::string(rest.substr(slash));

  if (authority.empty()) {
    return std::nullopt;
  }

  std::string host;
  uint16_t port = 80;

  if (authority.front() == '[') {
    auto close = authority.find(']');
    if (close == std::string_view::npos) {
      return std::nullopt;
    }
    host = std::string(authority.substr(1, close - 1));
    if (close + 1 < authority.size()) {
      if (authority[close + 1] != ':') {
        return std::nullopt;
      }
      const auto port_sv = authority.substr(close + 2);
      if (port_sv.empty()) {
        return std::nullopt;
      }
      try {
        port = static_cast<uint16_t>(std::stoi(std::string(port_sv)));
      } catch (...) {
        return std::nullopt;
      }
    }
  } else {
    auto colon = authority.rfind(':');
    if (colon == std::string_view::npos) {
      host = std::string(authority);
    } else {
      host = std::string(authority.substr(0, colon));
      const auto port_sv = authority.substr(colon + 1);
      if (port_sv.empty()) {
        return std::nullopt;
      }
      try {
        port = static_cast<uint16_t>(std::stoi(std::string(port_sv)));
      } catch (...) {
        return std::nullopt;
      }
    }
  }

  if (host.empty()) {
    return std::nullopt;
  }

  ParsedUrl parsed;
  parsed.host = std::move(host);
  parsed.uri = std::move(uri);
  parsed.port = port;
  parsed.host_header =
      parsed.port == 80 ? parsed.host : parsed.host + ":" + std::to_string(parsed.port);
  return parsed;
}

}  // namespace

struct Client::Impl {
  mutable std::mutex mutex;
  mutable wpi::net::EventLoopRunner loop_runner;
  mutable std::shared_ptr<wpi::net::uv::Tcp> tcp;
  mutable WebSocketHandle websocket;
  mutable std::string last_url;
};

Client::Client() : m_impl(std::make_unique<Impl>()) {}

Client::~Client() = default;

Client::WebSocketHandle Client::socket() const {
  std::scoped_lock lock(m_impl->mutex);
  return m_impl->websocket;
}

// Opens a WebSocket connection to the specified URL.
void Client::open(const std::string& url) {
  auto parsed = parse_ws_url(url);
  if (!parsed.has_value()) {
    std::fprintf(stderr, "progress_update_sender: invalid WebSocket URL: %s\n",
                 url.c_str());
    return;
  }

  {
    std::scoped_lock lock(m_impl->mutex);
    m_impl->last_url = url;
  }

  struct AttemptState {
    std::mutex mutex;
    std::condition_variable cv;
    bool done = false;
    bool success = false;
    std::string failure_reason;
  };

  auto state = std::make_shared<AttemptState>();

  m_impl->loop_runner.ExecSync([this, parsed, state](wpi::net::uv::Loop& loop) {
    m_impl->tcp = wpi::net::uv::Tcp::Create(loop);
    if (!m_impl->tcp) {
      std::scoped_lock state_lock(state->mutex);
      state->done = true;
      state->success = false;
      state->failure_reason = "failed to create TCP client";
      state->cv.notify_all();
      return;
    }

    m_impl->tcp->SetNoDelay(true);
    m_impl->tcp->error.connect([state](wpi::net::uv::Error err) {
      std::scoped_lock state_lock(state->mutex);
      if (state->done) {
        return;
      }
      state->done = true;
      state->success = false;
      state->failure_reason = std::string(err.str());
      state->cv.notify_all();
    });

    sockaddr_in dest{};
    if (wpi::net::uv::NameToAddr(parsed->host, parsed->port, &dest) != 0) {
      std::scoped_lock state_lock(state->mutex);
      state->done = true;
      state->success = false;
      state->failure_reason = "failed to resolve host";
      state->cv.notify_all();
      return;
    }

    m_impl->tcp->Connect(dest, [this, parsed, state]() {
      auto ws = wpi::net::WebSocket::CreateClient(*m_impl->tcp, parsed->uri,
                                                  parsed->host_header);
      if (!ws) {
        std::scoped_lock state_lock(state->mutex);
        state->done = true;
        state->success = false;
        state->failure_reason = "failed to create WebSocket client";
        state->cv.notify_all();
        return;
      }

      ws->open.connect([this, ws = ws.get(), state](std::string_view) {
        {
          std::scoped_lock lock(m_impl->mutex);
          m_impl->websocket = ws->shared_from_this();
        }
        std::scoped_lock state_lock(state->mutex);
        state->done = true;
        state->success = true;
        state->cv.notify_all();
      });

      ws->closed.connect([this, state](uint16_t, std::string_view reason) {
        {
          std::scoped_lock lock(m_impl->mutex);
          m_impl->websocket.reset();
        }
        std::scoped_lock state_lock(state->mutex);
        if (state->done) {
          return;
        }
        state->done = true;
        state->success = false;
        state->failure_reason = std::string(reason);
        state->cv.notify_all();
      });
    });
  });

  std::unique_lock wait_lock(state->mutex);
  const bool signaled = state->cv.wait_for(wait_lock, kConnectTimeout,
                                           [&state] { return state->done; });

  if (signaled && state->success) {
    return;
  }

  std::scoped_lock lock(m_impl->mutex);
  m_impl->websocket.reset();
  if (!signaled) {
    std::fprintf(stderr, "progress_update_sender: connection attempt timed out\n");
  } else {
    std::fprintf(stderr, "progress_update_sender: connection attempt failed: %s\n",
                 state->failure_reason.c_str());
  }
}

void Client::sendDiagnosticText(const std::string& text) const {
  auto payload = wpi::util::json::object();
  payload["text"] = text;

  auto message = wpi::util::json::object();
  message["version"] = 1;
  message["event"] = "diagnostic";
  message["payload"] = std::move(payload);
  send(std::move(message));
}

void Client::sendError(const std::string& errorMessage) const {
  auto payload = wpi::util::json::object();
  payload["message"] = errorMessage;

  auto message = wpi::util::json::object();
  message["version"] = 1;
  message["event"] = "error";
  message["payload"] = std::move(payload);
  send(std::move(message));
}

void Client::sendCompleteTrajectory(
    const std::string& trajectoryFileContents) const {
  auto payload = wpi::util::json::object();
  payload["trajectoryFile"] = trajectoryFileContents;

  auto message = wpi::util::json::object();
  message["version"] = 1;
  message["event"] = "completeTrajectory";
  message["payload"] = std::move(payload);
  send(std::move(message));
}

void Client::send(wpi::util::json json) const {
  const auto payload = json.to_string();

  bool queued = false;
  auto payload_copy = std::make_shared<std::string>(payload);
  m_impl->loop_runner.ExecSync(
      [this, &queued, payload_copy](wpi::net::uv::Loop&) {
        auto ws = socket();
        if (!ws || !ws->IsOpen()) {
          return;
        }

        auto buffer = wpi::net::uv::Buffer(*payload_copy);
        ws->SendText({buffer},
                     [this, payload_copy](std::span<wpi::net::uv::Buffer>,
                                          wpi::net::uv::Error err) {
                       if (!err) {
                         return;
                       }
                       std::scoped_lock lock(m_impl->mutex);
                       m_impl->websocket.reset();
                     });
        queued = true;
      });

  if (!queued) {
    std::fprintf(stderr,
                 "progress_update_sender: send dropped because socket is not open\n");
  }
}

}  // namespace choreo::progress_update_sender