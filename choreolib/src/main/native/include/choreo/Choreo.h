// Copyright (c) Choreo contributors

#pragma once

#include <iostream>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include <fmt/format.h>
#include <frc/Errors.h>
#include <frc/Filesystem.h>
#include <wpi/MemoryBuffer.h>
#include <wpi/json.h>

#include "choreo/trajectory/ProjectFile.h"
#include "choreo/trajectory/Trajectory.h"

namespace choreo {
/// A class that handles loading choreo and caching choreo trajectories
class Choreo {
 public:
  /**
   * Gets the project file from the deploy directory. Choreolib expects a .chor
   * file to be placed in src/main/deploy/choreo.
   *
   * <p>The result is cached after the first call.
   *
   * @return the project file
   */
  static choreo::ProjectFile GetProjectFile() {
    if (LAZY_PROJECT_FILE.has_value()) {
      return LAZY_PROJECT_FILE.value();
    }

    std::vector<std::filesystem::path> matchingFiles;

    try {
      for (const auto& entry :
           std::filesystem::directory_iterator(CHOREO_DIR)) {
        if (std::filesystem::is_regular_file(entry) &&
            entry.path().extension() == TRAJECTORY_FILE_EXTENSION) {
          matchingFiles.push_back(entry.path());
        }
      }

      if (matchingFiles.size() == 0) {
        FRC_ReportError(frc::warn::Warning,
                        "Could not find file in deploy directory!");
      } else if (matchingFiles.size() > 1) {
        FRC_ReportError(frc::warn::Warning,
                        "Found multiple project files in deploy directory!");
      }

      auto fileBuffer = wpi::MemoryBuffer::GetFile(matchingFiles[0].string());
      if (!fileBuffer) {
        FRC_ReportError(frc::warn::Warning,
                        "Could not open choreo project file");
      }

      choreo::ProjectFile resultProjectFile;
      choreo::from_json(fileBuffer.value()->GetCharBuffer(), resultProjectFile);
      LAZY_PROJECT_FILE = resultProjectFile;
    } catch (const std::filesystem::filesystem_error& e) {
      std::cout << e.what() << "\n";
      FRC_ReportError(frc::warn::Warning, "Error finding choreo directory!");
    } catch (const wpi::json::exception& e) {
      std::cout << e.what() << "\n";
      FRC_ReportError(frc::warn::Warning, "Error parsing choreo project file!");
    }
    return LAZY_PROJECT_FILE.value();
  }

  /**
   * Load a trajectory from the deploy directory. Choreolib expects .traj files
   * to be placed in src/main/deploy/choreo/[trajectoryName].traj.
   *
   * @param <SampleType> The type of samples in the trajectory.
   * @param trajectoryName the path name in Choreo, which matches the file name
   * in the deploy directory, file extension is optional.
   * @return the loaded trajectory, or `empty std::optional` if the trajectory
   * could not be loaded.
   */
  template <choreo::TrajectorySample SampleType>
  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectory(
      std::string trajectoryName) {
    if (trajectoryName.ends_with(TRAJECTORY_FILE_EXTENSION)) {
      trajectoryName = trajectoryName.substr(
          0, trajectoryName.size() - TRAJECTORY_FILE_EXTENSION.size());
    }

    std::string trajectoryFileName = fmt::format(
        "{}/{}{}", CHOREO_DIR, trajectoryName, TRAJECTORY_FILE_EXTENSION);

    auto fileBuffer = wpi::MemoryBuffer::GetFile(trajectoryFileName);
    if (!fileBuffer) {
      FRC_ReportError(frc::warn::Warning, "Could not find trajectory file: {}",
                      trajectoryName);
      return {};
    }

    try {
      return LoadTrajectoryString<SampleType>(
          std::string{fileBuffer.value()->GetCharBuffer().data(),
                      fileBuffer.value()->size()});
    } catch (wpi::json::parse_error& ex) {
      FRC_ReportError(frc::warn::Warning, "Could not parse trajectory file: {}",
                      trajectoryName);
      FRC_ReportError(frc::warn::Warning, "{}", ex.what());
      return {};
    }
    return {};
  }

  template <choreo::TrajectorySample SampleType>
  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectoryString(
      const std::string& trajJsonString) {
    wpi::json json = wpi::json::parse(trajJsonString);
    choreo::Trajectory<SampleType> trajectory;
    choreo::from_json(json, trajectory);
    return trajectory;
  }

  static std::string_view GetChoreoDir() { return CHOREO_DIR; }

 private:
  static constexpr std::string_view TRAJECTORY_FILE_EXTENSION = ".traj";

  static inline std::optional<choreo::ProjectFile> LAZY_PROJECT_FILE = {};

  static inline const std::string CHOREO_DIR =
      frc::filesystem::GetDeployDirectory() + "/choreo";

  Choreo();
};

/**
 * A utility for caching loaded trajectories. This allows for loading
 * trajectories only once, and then reusing them.
 */
template <choreo::TrajectorySample SampleType>
class ChoreoTrajCache {
 public:
  /**
   * Load a trajectory from the deploy directory. Choreolib expects .traj files
   * to be placed in src/main/deploy/choreo/[trajectoryName].traj.
   *
   * <p>This method will cache the loaded trajectory and reused it if it is
   * requested again.
   *
   * @param trajectoryName the path name in Choreo, which matches the file name
   * in the deploy directory, file extension is optional.
   * @return the loaded trajectory, or `empty std::optional` if the trajectory
   * could not be loaded.
   * @see Choreo#LoadTrajectory(const std::string&)
   */
  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectory(
      const std::string& trajectoryName) {
    if (cache.contains(trajectoryName)) {
      return cache[trajectoryName];
    } else {
      cache[trajectoryName] =
          Choreo::LoadTrajectory<SampleType>(trajectoryName);
      return cache[trajectoryName];
    }
  }

  /**
   * Load a section of a split trajectory from the deploy directory. Choreolib
   * expects .traj files to be placed in
   * src/main/deploy/choreo/[trajectoryName].traj.
   *
   * <p>This method will cache the loaded trajectory and reused it if it is
   * requested again. The trajectory that is split off of will also be cached.
   *
   * @param trajectoryName the path name in Choreo, which matches the file name
   * in the deploy directory, file extension is optional.
   * @param splitIndex the index of the split trajectory to load
   * @return the loaded trajectory, or `empty std::optional` if the trajectory
   * could not be loaded.
   * @see Choreo#LoadTrajectory(const std::string&)
   */
  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectory(
      const std::string& trajectoryName, int splitIndex) {
    std::string key = trajectoryName + ".:." + std::to_string(splitIndex);
    if (cache.contains(key)) {
      return cache[key];
    } else if (cache.contains(trajectoryName)) {
      cache[key] = cache[trajectoryName].GetSplit(splitIndex);
      return cache[key];
    } else {
      auto possibleTrajectory = LoadTrajectory(trajectoryName);
      cache[trajectoryName] = possibleTrajectory;
      if (possibleTrajectory.has_value()) {
        cache[key] = possibleTrajectory.value().GetSplit(splitIndex);
      }
      return cache[key];
    }
  }

  /// Clears the trajectory cache
  static void Clear() { cache.clear(); }

 private:
  static inline std::unordered_map<std::string, choreo::Trajectory<SampleType>>
      cache;
};
}  // namespace choreo
