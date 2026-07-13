#include "progress_update_relay/options.hpp"

#include <string_view>

namespace progress_update_relay {

namespace {

bool ParseUint16(std::string_view text, uint16_t& value) {
  if (text.empty()) {
    return false;
  }

  uint32_t parsed = 0;
  for (char c : text) {
    if (c < '0' || c > '9') {
      return false;
    }
    parsed = parsed * 10 + static_cast<uint32_t>(c - '0');
    if (parsed > 65535) {
      return false;
    }
  }

  value = static_cast<uint16_t>(parsed);
  return true;
}

void NormalizePath(std::string& path) {
  if (path.empty() || path.front() != '/') {
    path = "/" + path;
  }
}

}  // namespace

void PrintUsage(std::ostream& out, const char* exe_name) {
  out << "Usage: " << exe_name << " [options]\n"
      << "  --bind-address <address>        Bind address (default 127.0.0.1)\n"
      << "  --http-port <port>              HTTP/WS port (default 8080)\n"
      << "  --progress-ws-path <path>       Progress WS path (default /progress)\n"
      << "  --dashboard-ws-path <path>      Dashboard WS path (default /dashboard)\n"
      << "  --help                          Show this help\n";
}

ParseResult ParseArgs(int argc, char** argv, CliOptions& options,
                      std::ostream& err) {
  for (int i = 1; i < argc; ++i) {
    const std::string_view arg = argv[i];
    if (arg == "--help") {
      return ParseResult::Help;
    }

    if (i + 1 >= argc) {
      err << "Missing value for argument: " << arg << "\n";
      return ParseResult::Error;
    }

    const std::string_view value = argv[++i];
    if (arg == "--bind-address") {
      options.bind_address = std::string(value);
    } else if (arg == "--http-port") {
      uint16_t port = 0;
      if (!ParseUint16(value, port) || port == 0) {
        err << "Invalid port: " << value << "\n";
        return ParseResult::Error;
      }
      options.http_port = port;
    } else if (arg == "--progress-ws-path") {
      options.progress_ws_path = std::string(value);
    } else if (arg == "--dashboard-ws-path") {
      options.dashboard_ws_path = std::string(value);
    } else {
      err << "Unknown argument: " << arg << "\n";
      return ParseResult::Error;
    }
  }

  NormalizePath(options.progress_ws_path);
  NormalizePath(options.dashboard_ws_path);
  return ParseResult::Ok;
}

}  // namespace progress_update_relay
