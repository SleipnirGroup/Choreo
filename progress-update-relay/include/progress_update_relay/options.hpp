#pragma once

#include <cstdint>
#include <ostream>
#include <string>

namespace progress_update_relay {

enum class ParseResult {
  Ok,
  Help,
  Error,
};

struct CliOptions {
  std::string bind_address = "127.0.0.1";
  uint16_t http_port = 8080;
  std::string progress_ws_path = "/progress";
  std::string dashboard_ws_path = "/dashboard";
};

void PrintUsage(std::ostream& out, const char* exe_name);
ParseResult ParseArgs(int argc, char** argv, CliOptions& options,
                      std::ostream& err);

}  // namespace progress_update_relay
