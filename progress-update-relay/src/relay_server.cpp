#include "progress_update_relay/relay_server.hpp"

#include <algorithm>
#include <cstdio>
#include <memory>
#include <span>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

#include "progress_update_relay/dashboard_page.hpp"
#include "wpi/net/EventLoopRunner.hpp"
#include "wpi/net/HttpWebSocketServerConnection.hpp"
#include "wpi/net/UrlParser.hpp"
#include "wpi/net/WebSocket.hpp"
#include "wpi/net/uv/Buffer.hpp"
#include "wpi/net/uv/Stream.hpp"
#include "wpi/net/uv/Tcp.hpp"
#include "wpi/util/json.hpp"

namespace progress_update_relay {

class RelayServer::Impl {
 public:
  explicit Impl(CliOptions options)
      : m_options(std::move(options)),
        m_dashboard_html(BuildDashboardHtml(m_options)) {}

  bool Start() {
    bool ok = true;
    m_loop_runner.ExecSync([this, &ok](wpi::net::uv::Loop& loop) {
      m_server = wpi::net::uv::Tcp::Create(loop);
      if (!m_server) {
        std::fprintf(stderr, "progress-update-relay: failed to create TCP server\n");
        ok = false;
        return;
      }

      m_server->error.connect([](wpi::net::uv::Error err) {
        std::fprintf(stderr, "progress-update-relay: server error: %s\n",
                     std::string(err.str()).c_str());
      });

      m_server->Bind(m_options.bind_address, m_options.http_port);
      m_server->Listen([this] { AcceptClient(); });
    });
    return ok;
  }

  void Stop() {
    m_loop_runner.ExecSync([this](wpi::net::uv::Loop&) {
      if (m_producer) {
        m_producer->Close();
        m_producer.reset();
      }

      for (auto& ws : m_dashboards) {
        ws->Close();
      }
      m_dashboards.clear();

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
    });
  }

 private:
  class RelayConnection;

  struct ConnectionHandle {
    std::shared_ptr<wpi::net::uv::Tcp> stream;
    std::shared_ptr<RelayConnection> handler;
  };

  class RelayConnection
      : public wpi::net::HttpWebSocketServerConnection<RelayConnection> {
   public:
    RelayConnection(std::shared_ptr<wpi::net::uv::Stream> stream, Impl& owner)
        : wpi::net::HttpWebSocketServerConnection<RelayConnection>(stream, {}),
          m_owner(owner) {}

   protected:
    void ProcessRequest() override {
      const bool is_get = m_request.GetMethod() == wpi::net::HTTP_GET;
      wpi::net::UrlParser parser{m_request.GetUrl(),
                                 m_request.GetMethod() == wpi::net::HTTP_CONNECT};
      if (!parser.IsValid()) {
        SendError(400, "Invalid URL");
        return;
      }

      std::string_view path = "/";
      if (parser.HasPath()) {
        path = parser.GetPath();
      }

      if (is_get && path == "/") {
        SendResponse(200, "OK", "text/html; charset=utf-8", m_owner.m_dashboard_html);
      } else {
        SendError(404, "Not Found");
      }
    }

    bool IsValidWsUpgrade(std::string_view) override {
      wpi::net::UrlParser parser{m_request.GetUrl(),
                                 m_request.GetMethod() == wpi::net::HTTP_CONNECT};
      if (!parser.IsValid() || !parser.HasPath()) {
        return false;
      }

      const auto path = parser.GetPath();
      return path == m_owner.m_options.progress_ws_path ||
             path == m_owner.m_options.dashboard_ws_path;
    }

    void ProcessWsUpgrade() override {
      auto ws = m_websocket->shared_from_this();
      wpi::net::UrlParser parser{m_request.GetUrl(),
                                 m_request.GetMethod() == wpi::net::HTTP_CONNECT};

      std::string_view path = "/";
      if (parser.IsValid() && parser.HasPath()) {
        path = parser.GetPath();
      }

      if (path == m_owner.m_options.progress_ws_path) {
        m_owner.SetProducer(ws);
        ws->text.connect([this](std::string_view data, bool) {
          m_owner.OnProducerMessage(data);
        });
        ws->closed.connect([this, ws](uint16_t, std::string_view) {
          m_owner.OnProducerClosed(ws);
        });
      } else if (path == m_owner.m_options.dashboard_ws_path) {
        m_owner.m_dashboards.push_back(ws);
        auto message = wpi::util::json::object();
        message["relay"] = "producerStatus";
        message["connected"] = static_cast<bool>(m_owner.m_producer);
        m_owner.SendText(ws, message.to_string());

        ws->closed.connect([this, ws](uint16_t, std::string_view) {
          m_owner.RemoveDashboard(ws);
        });
      } else {
        ws->Close(1008, "unknown websocket path");
      }
    }

   private:
    Impl& m_owner;
  };

  void AcceptClient() {
    auto client = m_server->Accept();
    if (!client) {
      std::fprintf(stderr, "progress-update-relay: failed to accept client\n");
      return;
    }

    client->error.connect([ptr = client.get()](wpi::net::uv::Error) { ptr->Close(); });

    auto handler = std::make_shared<RelayConnection>(client, *this);
    client->SetData(handler);
    m_connections.push_back(ConnectionHandle{client, handler});
  }

  void RemoveDashboard(const std::shared_ptr<wpi::net::WebSocket>& ws) {
    auto same = [&ws](const std::shared_ptr<wpi::net::WebSocket>& candidate) {
      return candidate.get() == ws.get();
    };

    m_dashboards.erase(
        std::remove_if(m_dashboards.begin(), m_dashboards.end(), same),
        m_dashboards.end());
  }

  void SetProducer(const std::shared_ptr<wpi::net::WebSocket>& ws) {
    if (m_producer && m_producer.get() != ws.get()) {
      m_producer->Close(1000, "replaced by new producer");
    }

    m_producer = ws;

    auto message = wpi::util::json::object();
    message["relay"] = "producerStatus";
    message["connected"] = true;
    BroadcastJson(message.to_string());
  }

  void OnProducerClosed(const std::shared_ptr<wpi::net::WebSocket>& ws) {
    if (m_producer && m_producer.get() == ws.get()) {
      m_producer.reset();

      auto message = wpi::util::json::object();
      message["relay"] = "producerStatus";
      message["connected"] = false;
      BroadcastJson(message.to_string());
    }
  }

  void OnProducerMessage(std::string_view data) {
    auto parsed = wpi::util::json::parse_or_throw(data);
    if (!parsed.is_object()) {
      std::fprintf(stderr, "progress-update-relay: received malformed JSON frame\n");
      return;
    }

    const auto& event = parsed.at("event");
    if (!event.is_string()) {
      std::fprintf(stderr, "progress-update-relay: progress frame missing event\n");
      return;
    }

    BroadcastJson(parsed.to_string());
  }

  void SendText(const std::shared_ptr<wpi::net::WebSocket>& ws,
                std::string text) {
    auto payload = std::make_shared<std::string>(std::move(text));
    ws->SendText(
        {wpi::net::uv::Buffer(*payload)},
        [payload](std::span<wpi::net::uv::Buffer>, wpi::net::uv::Error) {});
  }

  void BroadcastJson(const std::string& json) {
    for (auto it = m_dashboards.begin(); it != m_dashboards.end();) {
      auto& ws = *it;
      if (!ws || !ws->IsOpen()) {
        it = m_dashboards.erase(it);
        continue;
      }
      SendText(ws, json);
      ++it;
    }
  }

  CliOptions m_options;
  std::string m_dashboard_html;
  wpi::net::EventLoopRunner m_loop_runner;
  std::shared_ptr<wpi::net::uv::Tcp> m_server;
  std::vector<ConnectionHandle> m_connections;
  std::vector<std::shared_ptr<wpi::net::WebSocket>> m_dashboards;
  std::shared_ptr<wpi::net::WebSocket> m_producer;
};

RelayServer::RelayServer(CliOptions options)
    : m_impl(std::make_unique<Impl>(std::move(options))) {}

RelayServer::~RelayServer() = default;

bool RelayServer::Start() {
  return m_impl->Start();
}

void RelayServer::Stop() {
  m_impl->Stop();
}

}  // namespace progress_update_relay
