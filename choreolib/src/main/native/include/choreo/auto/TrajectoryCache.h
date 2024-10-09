// Copyright (c) Choreo contributors

#pragma once

#include <string>
#include <unordered_map>

#include "choreo/Choreo.h"
#include "choreo/trajectory/Trajectory.h"
#include "choreo/trajectory/TrajectorySample.h"

namespace choreo {
/**
 * A utility for caching loaded trajectories. This allows for loading
 * trajectories only once, and then reusing them.
 */
template <choreo::TrajectorySample SampleType>
class TrajectoryCache {
 public:
  /**
   * Load a trajectory from the deploy directory. Choreolib expects .traj files
   * to be placed in src/main/deploy/choreo/[trajectoryName].traj.
   *
   * This method will cache the loaded trajectory and reused it if it is
   * requested again.
   *
   * @param trajectoryName the path name in Choreo, which matches the file name
   * in the deploy directory, file extension is optional.
   * @return the loaded trajectory, or `empty std::optional` if the trajectory
   * could not be loaded.
   * @see Choreo#LoadTrajectory(std::string_view)
   */
  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectory(
      std::string_view trajectoryName) {
    if (cache.contains(std::string{trajectoryName})) {
      return cache[std::string{trajectoryName}];
    } else {
      cache[std::string{trajectoryName}] =
          Choreo::LoadTrajectory<SampleType>(trajectoryName);
      return cache[std::string{trajectoryName}];
    }
  }

  /**
   * Load a section of a split trajectory from the deploy directory. Choreolib
   * expects .traj files to be placed in
   * src/main/deploy/choreo/[trajectoryName].traj.
   *
   * This method will cache the loaded trajectory and reused it if it is
   * requested again. The trajectory that is split off of will also be cached.
   *
   * @param trajectoryName the path name in Choreo, which matches the file name
   * in the deploy directory, file extension is optional.
   * @param splitIndex the index of the split trajectory to load
   * @return the loaded trajectory, or `empty std::optional` if the trajectory
   * could not be loaded.
   * @see Choreo#LoadTrajectory(std::string_view)
   */
  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectory(
      std::string_view trajectoryName, int splitIndex) {
    std::string key = fmt::format("{}.:.{}", trajectoryName, splitIndex);

    if (!cache.contains(key)) {
      if (cache.contains(std::string{trajectoryName})) {
        cache[key] = cache[std::string{trajectoryName}].GetSplit(splitIndex);
      } else {
        auto possibleTrajectory = LoadTrajectory(trajectoryName);
        cache[std::string{trajectoryName}] = possibleTrajectory;

        if (possibleTrajectory.has_value()) {
          cache[key] = possibleTrajectory.value().GetSplit(splitIndex);
        }
      }
    }

    return cache[key];
  }

  /**
   * Clears the trajectory cache.
   */
  static void Clear() { cache.clear(); }

 private:
  static inline std::unordered_map<
      std::string, std::optional<choreo::Trajectory<SampleType>>>
      cache;
};
}  // namespace choreo
