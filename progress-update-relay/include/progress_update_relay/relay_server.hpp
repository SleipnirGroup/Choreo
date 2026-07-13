#pragma once

#include <memory>

#include "progress_update_relay/options.hpp"

namespace progress_update_relay {

class RelayServer {
 public:
  explicit RelayServer(CliOptions options);
  ~RelayServer();

  RelayServer(const RelayServer&) = delete;
  RelayServer& operator=(const RelayServer&) = delete;
  RelayServer(RelayServer&&) = delete;
  RelayServer& operator=(RelayServer&&) = delete;

  bool Start();
  void Stop();

 private:
  class Impl;
  std::unique_ptr<Impl> m_impl;
};

}  // namespace progress_update_relay
