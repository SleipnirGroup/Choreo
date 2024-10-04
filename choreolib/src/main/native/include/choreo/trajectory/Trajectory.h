// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <optional>
#include <ranges>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

#include <wpi/json_fwd.h>

#include "choreo/trajectory/DifferentialSample.h"
#include "choreo/trajectory/EventMarker.h"
#include "choreo/trajectory/SwerveSample.h"
#include "choreo/trajectory/TrajectorySample.h"
#include "choreo/util/AllianceFlipperUtil.h"

namespace choreo {

/**
 * A trajectory loaded from Choreo.
 *
 * @param <SampleType> DifferentialSample or SwerveSample.
 */
template <TrajectorySample SampleType>
class Trajectory {
 public:
  /**
   * Constructs a Trajectory with defaults
   */
  Trajectory() = default;

  /**
   * Constructs a Trajectory with the specified parameters.
   *
   * @param name The name of the trajectory.
   * @param samples The samples of the trajectory.
   * @param splits The indices of the splits in the trajectory.
   * @param events The events in the trajectory.
   */
  Trajectory(std::string_view name, std::vector<SampleType> samples,
             std::vector<int> splits, std::vector<EventMarker> events)
      : name{name},
        samples{std::move(samples)},
        splits{std::move(splits)},
        events{std::move(events)} {}

  /**
   * Returns the first SampleType in the trajectory.
   *
   * Will return an empty optional if the trajectory is empty
   *
   * @return The first sample in the trajectory.
   */
  std::optional<SampleType> GetInitialState() {
    if (samples.size() == 0) {
      return {};
    }
    return samples[0];
  }

  /**
   * Returns the last SampleType in the trajectory.
   *
   * Will return an empty optional if the trajectory is empty
   *
   * @return The last sample in the trajectory.
   */
  std::optional<SampleType> GetFinalSample() {
    if (samples.size() == 0) {
      return {};
    }
    return samples[samples.size() - 1];
  }

  /**
   * Return an interpolated sample of the trajectory at the given timestamp.
   *
   * This function will return an empty optional if the trajectory is empty.
   *
   * @tparam Year The field year (default: the current year).
   * @param timestamp The timestamp of this sample relative to the beginning of
   * the trajectory.
   * @param mirrorForRedAlliance whether or not to return the sample mirrored.
   * @return The SampleType at the given time.
   */
  template <int Year = util::kDefaultYear>
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
    if (state.has_value()) {
      return mirrorForRedAlliance ? state.value().template Flipped<Year>()
                                  : state;
    } else {
      return {};
    }
  }

  /**
   * Returns the first Pose in the trajectory.
   *
   * Will return an empty optional if the trajectory is empty
   *
   * @tparam Year The field year (default: the current year).
   * @param mirrorForRedAlliance whether or not to return the Pose mirrored.
   * @return The first Pose in the trajectory.
   */
  template <int Year = util::kDefaultYear>
  std::optional<frc::Pose2d> GetInitialPose(bool mirrorForRedAlliance) {
    if (samples.size() == 0) {
      return {};
    }
    if (mirrorForRedAlliance) {
      return samples[0].template Flipped<Year>().GetPose();
    }
    return samples[0].GetPose();
  }

  /**
   * Returns the last Pose in the trajectory.
   *
   * Will return an empty optional if the trajectory is empty
   *
   * @tparam Year The field year (default: the current year).
   * @param mirrorForRedAlliance whether or not to return the Pose mirrored.
   * @return The last Pose in the trajectory.
   */
  template <int Year = util::kDefaultYear>
  std::optional<frc::Pose2d> GetFinalPose(bool mirrorForRedAlliance) {
    if (samples.size() == 0) {
      return {};
    }
    if (mirrorForRedAlliance) {
      return samples[samples.size() - 1].template Flipped<Year>().GetPose();
    }
    return samples[samples.size() - 1].GetPose();
  }

  /**
   * The total time the trajectory will take to follow
   *
   * @return The total time the trajectory will take to follow, if empty will
   * return 0 seconds.
   */
  units::second_t GetTotalTime() {
    if (samples.size() == 0) {
      return 0_s;
    }
    return samples[samples.size() - 1].GetTimestamp();
  }

  /**
   * Returns the vector of poses corresponding to the trajectory.
   *
   * @return the vector of poses corresponding to the trajectory.
   */
  std::vector<frc::Pose2d> GetPoses() {
    std::vector<frc::Pose2d> poses;
    for (const auto& sample : samples) {
      poses.push_back(sample.GetPose());
    }
    return poses;
  }

  /**
   * Returns this trajectory, mirrored across the field midline.
   *
   * @tparam Year The field year (default: the current year).
   * @return this trajectory, mirrored across the field midline.
   */
  template <int Year = util::kDefaultYear>
  Trajectory<SampleType> Flipped() {
    std::vector<SampleType> flippedStates;
    for (const auto& state : samples) {
      flippedStates.push_back(state.template Flipped<Year>());
    }
    return Trajectory<SampleType>(name, flippedStates, splits, events);
  }

  /**
   * Returns a vector of all events with the given name in the trajectory.
   *
   * @param eventName The name of the event.
   * @return A vector of all events with the given name in the trajectory, if no
   * events are found, an empty vector is returned.
   */
  std::vector<EventMarker> GetEvents(std::string_view eventName) {
    std::vector<EventMarker> matchingEvents;
    for (const auto& event : events) {
      if (event.event == eventName) {
        matchingEvents.push_back(event);
      }
    }
    return matchingEvents;
  }

  /**
   * Returns a choreo trajectory that represents the split of the trajectory at
   * the given index.
   *
   * @param splitIndex the index of the split trajectory to return.
   * @return a choreo trajectory that represents the split of the trajectory at
   * the given index.
   */
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

  // Equality operators for trajectories
  bool operator==(const Trajectory<SampleType>& other) const {
    if (name != other.name) {
      return false;
    }

    if (samples.size() != other.samples.size()) {
      return false;
    }
    if (!std::equal(samples.begin(), samples.end(), other.samples.begin())) {
      return false;
    }

    if (splits != other.splits) {
      return false;
    }

    if (events.size() != other.events.size()) {
      return false;
    }
    if (!std::equal(events.begin(), events.end(), other.events.begin())) {
      return false;
    }

    return true;
  }

  bool operator!=(const Trajectory<SampleType>& other) const {
    return !(*this == other);
  }

  /// The name of the trajectory
  std::string name;

  /// The vector of samples in the trajectory
  std::vector<SampleType> samples;

  /// The waypoints indexes where the trajectory is split
  std::vector<int> splits;

  /// A vector of all of the events in the trajectory
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
void from_json(const wpi::json& json,
               Trajectory<DifferentialSample>& trajectory);

}  // namespace choreo
