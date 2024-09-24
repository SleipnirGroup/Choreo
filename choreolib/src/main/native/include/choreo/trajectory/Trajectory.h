// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <optional>
#include <ranges>
#include <string>
#include <vector>

#include <wpi/json_fwd.h>

#include "choreo/trajectory/DifferentialSample.h"
#include "choreo/trajectory/EventMarker.h"
#include "choreo/trajectory/SwerveSample.h"
#include "choreo/trajectory/TrajectorySample.h"

namespace choreo {
template <TrajectorySample SampleType>
class Trajectory {
 public:
  Trajectory() = default;
  Trajectory(const std::string& name, const std::vector<SampleType>& samples,
             const std::vector<int>& splits,
             const std::vector<EventMarker>& events)
      : name(name), samples(samples), splits(splits), events(events) {}
  std::optional<SampleType> GetInitialState() {
    if (samples.size() == 0) {
      return {};
    }
    return samples[0];
  }
  std::optional<SampleType> GetFinalSample() {
    if (samples.size() == 0) {
      return {};
    }
    return samples[samples.size() - 1];
  }
  template<int Year>
  std::optional<SampleType> SampleAt(units::second_t timestamp,
                                     bool mirrorForRedAlliance = false) {
    std::optional<SampleType> state{};
    if (samples.size() == 0) {
      return {};
    } else if (samples.size() == 1) {
      return samples[0];
    } else {
      state = SampleInternal(timestamp);
    }
    if(state.has_value()) {
      return mirrorForRedAlliance ? state.value().template Flipped<Year>() : state;
    }
    else {
      return {};
    }
  }
  template<int Year>
  std::optional<frc::Pose2d> GetInitialPose(bool mirrorForRedAlliance) {
    if (samples.size() == 0) {
      return {};
    }
    if (mirrorForRedAlliance) {
      return samples[0].template Flipped<Year>().GetPose();
    }
    return samples[0].GetPose();
  }
  template<int Year>
  std::optional<frc::Pose2d> GetFinalPose(bool mirrorForRedAlliance) {
    if (samples.size() == 0) {
      return {};
    }
    if (mirrorForRedAlliance) {
      return samples[samples.size() - 1].template Flipped<Year>().GetPose();
    }
    return samples[samples.size() - 1].GetPose();
  }
  units::second_t GetTotalTime() {
    if (samples.size() == 0) {
      return 0_s;
    }
    return samples[samples.size() - 1].GetTimestamp();
  }
  std::vector<frc::Pose2d> GetPoses() {
    std::vector<frc::Pose2d> poses;
    for (const auto& sample : samples) {
      poses.push_back(sample.GetPose());
    }
    return poses;
  }
  template<int Year>
  Trajectory<SampleType> Flipped() {
    std::vector<SampleType> flippedStates;
    for (const auto& state : samples) {
      flippedStates.push_back(state.template Flipped<Year>());
    }
    return Trajectory<SampleType>(name, flippedStates, splits, events);
  }
  std::vector<EventMarker> GetEvents(const std::string& eventName) {
    std::vector<EventMarker> matchingEvents;
    for (const auto& event : events) {
      if (event.event == eventName) {
        matchingEvents.push_back(event);
      }
    }
    return matchingEvents;
  }
  std::optional<Trajectory<SampleType>> GetSplit(int splitIndex) const {
    if (splitIndex < 0 || splitIndex >= splits.size()) {
      return std::nullopt;
    }

    int start = splits[splitIndex];
    int end = (splitIndex + 1 < splits.size()) ? splits[splitIndex + 1] + 1
                                               : samples.size();

    auto sublist =
        std::vector<SampleType>(samples.begin() + start, samples.begin() + end);
    double startTime = sublist.front().GetTimestamp();
    double endTime = sublist.back().GetTimestamp();

    auto offsetSamples =
        sublist | std::views::transform([startTime](const auto& s) {
          return s.offsetBy(-startTime);
        });

    auto filteredEvents =
        events | std::views::filter([startTime, endTime](const auto& e) {
          return e.timestamp >= startTime && e.timestamp <= endTime;
        }) |
        std::views::transform(
            [startTime](const auto& e) { return e.offsetBy(-startTime); });

    return Trajectory<SampleType>{
        name + "[" + std::to_string(splitIndex) + "]",
        std::vector<SampleType>(offsetSamples.begin(), offsetSamples.end()),
        {},
        std::vector<EventMarker>(filteredEvents.begin(), filteredEvents.end())};
  }

  std::string name;
  std::vector<SampleType> samples;
  std::vector<int> splits;
  std::vector<EventMarker> events;

 private:
  std::optional<SampleType> SampleInternal(units::second_t timestamp) {
    if (timestamp < samples[0].GetTimestamp()) {
      return GetInitialState();
    }
    if (timestamp >= GetTotalTime()) {
      return GetFinalSample();
    }

    int low = 0;
    int high = samples.size() - 1;

    while (low != high) {
      int mid = (low + high) / 2;
      if (samples[mid].GetTimestamp() < timestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    if (low == 0) {
      return samples[low];
    }

    SampleType behindState = samples[low - 1];
    SampleType aheadState = samples[low];

    if ((aheadState.GetTimestamp() - behindState.GetTimestamp()) < 1e-6_s) {
      return aheadState;
    }

    return behindState.Interpolate(aheadState, timestamp);
  }
};

void to_json(wpi::json& json, const Trajectory<SwerveSample>& trajectory);
void from_json(const wpi::json& json, Trajectory<SwerveSample>& trajectory);

void to_json(wpi::json& json, const Trajectory<DifferentialSample>& trajectory);
void from_json(const wpi::json& json, Trajectory<DifferentialSample>& trajectory);
}  // namespace choreo
