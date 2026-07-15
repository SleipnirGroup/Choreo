#include <atomic>
#include <chrono>
#include <csignal>
#include <iostream>
#include <thread>

#include "choreo/state_server/api_server.hpp"

namespace choreo::state_server {

using namespace std::chrono_literals;

std::atomic<bool> g_running = true;

void HandleSignal(int) { g_running = false; }

}  // namespace choreo::state_server

int main() {
  choreo::state_server::ServerOptions opts;
  choreo::state_server::ApiServer server(opts);

  std::signal(SIGINT, choreo::state_server::HandleSignal);
  std::signal(SIGTERM, choreo::state_server::HandleSignal);

  if (!server.Start()) {
    return 1;
  }

  std::cout << "state-server listening\n"
            << "  HTTP: http://" << opts.bind_address << ":" << opts.http_port
            << "\n"
            << "Press Ctrl+C to stop.\n";

  while (choreo::state_server::g_running.load()) {
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
  }

  server.Stop();
  return 0;
}
