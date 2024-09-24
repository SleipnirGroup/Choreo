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
class Choreo {
 public:
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

  template <choreo::TrajectorySample SampleType>
  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectory(
      std::string trajName) {
    if (trajName.ends_with(TRAJECTORY_FILE_EXTENSION)) {
      trajName = trajName.substr(
          0, trajName.size() - TRAJECTORY_FILE_EXTENSION.size());
    }

    std::string trajFileName =
        fmt::format("{}/{}{}", CHOREO_DIR, trajName, TRAJECTORY_FILE_EXTENSION);

    auto fileBuffer = wpi::MemoryBuffer::GetFile(trajFileName);
    if (!fileBuffer) {
      FRC_ReportError(frc::warn::Warning, "Could not find trajectory file: {}",
                      trajName);
      return {};
    }

    try {
      return LoadTrajectoryString<SampleType>(
          std::string{fileBuffer.value()->GetCharBuffer().data(),
                      fileBuffer.value()->size()});
    } catch (wpi::json::parse_error& ex) {
      FRC_ReportError(frc::warn::Warning, "Could not parse trajectory file: {}",
                      trajName);
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

template <choreo::TrajectorySample SampleType>
class ChoreoTrajCache {
 public:
  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectory(
      const std::string& trajName) {
    if (cache.contains(trajName)) {
      return cache[trajName];
    } else {
      cache[trajName] = Choreo::LoadTrajectory<SampleType>(trajName);
      return cache[trajName];
    }
  }

  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectory(
      const std::string& trajName, int splitIndex) {
    std::string key = trajName + ".:." + std::to_string(splitIndex);
    if (cache.contains(key)) {
      return cache[key];
    } else if (cache.contains(trajName)) {
      cache[key] = cache[trajName].GetSplit(splitIndex);
      return cache[key];
    } else {
      auto possibleTraj = LoadTrajectory(trajName);
      cache[trajName] = possibleTraj;
      if (possibleTraj.has_value()) {
        cache[key] = possibleTraj.value().GetSplit(splitIndex);
      }
      return cache[key];
    }
  }

  static void Clear() { cache.clear(); }

 private:
  static inline std::unordered_map<std::string, choreo::Trajectory<SampleType>>
      cache;
};
}  // namespace choreo
