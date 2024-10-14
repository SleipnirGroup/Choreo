// Copyright (c) Choreo contributors

#pragma once

#include <string>
#include <string_view>
#include <vector>

#include <fmt/format.h>
#include <frc/Errors.h>
#include <frc/Filesystem.h>
#include <wpi/MemoryBuffer.h>
#include <wpi/json.h>

#include "choreo/SpecVersion.h"
#include "choreo/trajectory/ProjectFile.h"
#include "choreo/trajectory/Trajectory.h"

namespace choreo {

/**
 * A class that handles loading choreo and caching choreo trajectories.
 */
class Choreo {
 public:
  /**
   * Gets the project file from the deploy directory. Choreolib expects a .chor
   * file to be placed in src/main/deploy/choreo.
   *
   * The result is cached after the first call.
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

      wpi::json json = wpi::json::parse(fileBuffer.value()->GetCharBuffer());
      std::string version = json["version"];
      if (kSpecVersion != version) {
        throw fmt::format(".chor project file: Wrong version {}. Expected {}",
                          version, kSpecVersion);
      }
      choreo::ProjectFile resultProjectFile;
      choreo::from_json(json, resultProjectFile);
      LAZY_PROJECT_FILE = resultProjectFile;
    } catch (const std::filesystem::filesystem_error&) {
      FRC_ReportError(frc::warn::Warning, "Error finding choreo directory!");
    } catch (const wpi::json::exception&) {
      FRC_ReportError(frc::warn::Warning, "Error parsing choreo project file!");
    }
    return LAZY_PROJECT_FILE.value();
  }

  /**
   * Load a trajectory from the deploy directory. Choreolib expects .traj files
   * to be placed in src/main/deploy/choreo/[trajectoryName].traj.
   *
   * @tparam SampleType The type of samples in the trajectory.
   * @param trajectoryName The path name in Choreo, which matches the file name
   *   in the deploy directory, file extension is optional.
   * @return The loaded trajectory, or `empty std::optional` if the trajectory
   *   could not be loaded.
   */
  template <choreo::TrajectorySample SampleType>
  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectory(
      std::string_view trajectoryName) {
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
                      fileBuffer.value()->size()},
          trajectoryName);
    } catch (wpi::json::parse_error& ex) {
      FRC_ReportError(frc::warn::Warning, "Could not parse trajectory file: {}",
                      trajectoryName);
      FRC_ReportError(frc::warn::Warning, "{}", ex.what());
      return {};
    }
    return {};
  }

  /**
   * Load a trajectory from a string.
   *
   * @tparam SampleType The type of samples in the trajectory.
   * @param trajectoryJsonString The JSON string.
   * @param trajectoryName The path name in Choreo, which matches the file name
   *   in the deploy directory, file extension is optional.
   * @return The loaded trajectory, or `empty std::optional` if the trajectory
   *   could not be loaded.
   */
  template <choreo::TrajectorySample SampleType>
  static std::optional<choreo::Trajectory<SampleType>> LoadTrajectoryString(
      std::string_view trajectoryJsonString, std::string_view trajectoryName) {
    wpi::json json = wpi::json::parse(trajectoryJsonString);
    std::string version = json["version"];
    if (kSpecVersion != version) {
      throw fmt::format("{}.traj: Wrong version {}. Expected {}",
                        trajectoryName, version, kSpecVersion);
    }
    choreo::Trajectory<SampleType> trajectory;
    choreo::from_json(json, trajectory);
    return trajectory;
  }

 private:
  static constexpr std::string_view TRAJECTORY_FILE_EXTENSION = ".traj";

  static inline std::optional<choreo::ProjectFile> LAZY_PROJECT_FILE = {};

  static inline const std::string CHOREO_DIR =
      frc::filesystem::GetDeployDirectory() + "/choreo";

  Choreo();
};
}  // namespace choreo
