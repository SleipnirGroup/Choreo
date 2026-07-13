#include <atomic>
#include <chrono>
#include <csignal>
#include <iostream>
#include <thread>

#include "progress_update_relay/options.hpp"
#include "progress_update_relay/relay_server.hpp"

namespace progress_update_relay {

using namespace std::chrono_literals;

std::atomic<bool> g_running = true;

void handle_signal(int) { g_running = false; }
}  // namespace progress_update_relay

int main(int argc, char** argv) {
  progress_update_relay::CliOptions opts;
  const auto parse_result =
      progress_update_relay::ParseArgs(argc, argv, opts, std::cerr);
  if (parse_result == progress_update_relay::ParseResult::Help) {
    progress_update_relay::PrintUsage(std::cout, argv[0]);
    return 0;
  }
  if (parse_result == progress_update_relay::ParseResult::Error) {
    progress_update_relay::PrintUsage(std::cerr, argv[0]);
    return 1;
  }

  std::signal(SIGINT, progress_update_relay::handle_signal);
  std::signal(SIGTERM, progress_update_relay::handle_signal);

  progress_update_relay::RelayServer relay(opts);
  if (!relay.Start()) {
    return 1;
  }

  std::cout << "progress-update-relay listening\n"
            << "  HTTP: http://" << opts.bind_address << ":" << opts.http_port << "/\n"
            << "  Progress WS receiver: ws://" << opts.bind_address << ":" << opts.http_port
            << opts.progress_ws_path << "\n"
            << "  Dashboard WS: ws://" << opts.bind_address << ":" << opts.http_port
            << opts.dashboard_ws_path << "\n\n"
            << "Generator example:\n"
            << "  ./build/generator.exe --chor ./test/test-default.chor --trajectory ./test/test-default.traj"
            << " --output ./test/test-output.traj --progress-url ws://" << opts.bind_address
            << ':' << opts.http_port << opts.progress_ws_path << "\n\n"
            << "Press Ctrl+C to stop.\n";

  while (progress_update_relay::g_running.load()) {
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
  }

  relay.Stop();
  return 0;
}
