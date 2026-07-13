#pragma once

#include <memory>
#include <span>
#include <string>
#include <vector>

#include <wpi/math/trajectory/struct/DifferentialSampleStruct.hpp>
#include <wpi/math/trajectory/struct/HolonomicSampleStruct.hpp>
#include <wpi/util/Base64.hpp>
#include <wpi/util/json.hpp>
#include <wpi/util/struct/Struct.hpp>

#include "choreo/trajectory/sample_concept.hpp"
#include "wpi/net/WebSocket.hpp"

/*
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[allow(clippy::large_enum_variant)]
pub enum RemoteProgressUpdate {
    // Swerve variant
    IncompleteSwerveTrajectory(Vec<Sample>),
    // Diff variant
    IncompleteTankTrajectory(Vec<Sample>),
    IntervalCounts(Vec<usize>),
    CompleteTrajectory(TrajectoryFile),
    Error(ChoreoError),
}*/
namespace choreo::progress_update_sender {

class Client {
 public:
  Client();
  ~Client();
  Client(const Client&) = delete;
  Client& operator=(const Client&) = delete;
  Client(Client&&) = delete;
  Client& operator=(Client&&) = delete;

  using WebSocketHandle = std::shared_ptr<wpi::net::WebSocket>;

  [[nodiscard]] WebSocketHandle socket() const;

  /// @brief Opens a WebSocket connection to the specified URL.
  /// @param url The URL to connect to.
  void open(const std::string& url);

  template <SampleLike Sample>
    requires wpi::util::StructSerializable<Sample>
  void sendIncompleteTrajectory(const std::vector<Sample>& samples) const;

  void sendDiagnosticText(const std::string& text) const;

  void sendError(const std::string& errorMessage) const;

  void sendCompleteTrajectory(const std::string& trajectoryFileContents) const;

 private:
  struct Impl;
  std::unique_ptr<Impl> m_impl;

  void send(wpi::util::json json) const;
};

template <SampleLike Sample>
  requires wpi::util::StructSerializable<Sample>
void Client::sendIncompleteTrajectory(const std::vector<Sample>& samples) const {
  std::string driveType = "Swerve";
  if constexpr (requires(const Sample& sample) {
                  sample.leftVelocity;
                  sample.rightVelocity;
                }) {
    driveType = "Differential";
  }

  std::string encodedSamples;
  wpi::util::StructArrayBuffer<Sample> structArrayBuffer;
  structArrayBuffer.Write(samples, [&encodedSamples](std::span<const uint8_t> data) {
    wpi::util::Base64Encode(data, &encodedSamples);
  });

  auto message = wpi::util::json::object();
  message["version"] = 1;
  message["event"] = "incompleteTrajectory";
  message["driveType"] = driveType;
  message["sampleCount"] = samples.size();
  message["sampleStructType"] = std::string(wpi::util::GetStructTypeString<Sample>());
  message["sampleStructSize"] = wpi::util::GetStructSize<Sample>();
  message["samplesBase64"] = std::move(encodedSamples);
  send(std::move(message));
}

}  // namespace progress_update_sender