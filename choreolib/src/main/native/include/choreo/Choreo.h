// Copyright (c) Choreo contributors

#pragma once

#include <concepts>
#include <functional>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

#include <fmt/format.h>
#include <frc/Errors.h>
#include <frc/Filesystem.h>
#include <frc/geometry/Pose2d.h>
#include <frc2/command/Subsystem.h>
#include <hal/FRCUsageReporting.h>
#include <wpi/MemoryBuffer.h>
#include <wpi/json.h>

#include "choreo/trajectory/DifferentialSample.h"
#include "choreo/trajectory/ProjectFile.h"
#include "choreo/trajectory/SwerveSample.h"
#include "choreo/trajectory/Trajectory.h"
#include "choreo/trajectory/TrajectorySample.h"
#include "choreo/util/AllianceFlipperUtil.h"

namespace choreo {

inline constexpr uint32_t kSpecVersion = 1;

template <TrajectorySample SampleType, int Year>
class AutoFactory;

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
  static ProjectFile GetProjectFile() {
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
      uint32_t version = json["version"];
      if (kSpecVersion != version) {
        throw fmt::format(".chor project file: Wrong version {}. Expected {}",
                          version, kSpecVersion);
      }
      ProjectFile resultProjectFile;
      from_json(json, resultProjectFile);
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
  template <TrajectorySample SampleType>
  static std::optional<Trajectory<SampleType>> LoadTrajectory(
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
  template <TrajectorySample SampleType>
  static std::optional<Trajectory<SampleType>> LoadTrajectoryString(
      std::string_view trajectoryJsonString, std::string_view trajectoryName) {
    if constexpr (std::same_as<SampleType, SwerveSample>) {
      HAL_Report(HALUsageReporting::kResourceType_ChoreoTrajectory, 1);
    } else if constexpr (std::same_as<SampleType, DifferentialSample>) {
      HAL_Report(HALUsageReporting::kResourceType_ChoreoTrajectory, 2);
    }

    wpi::json json = wpi::json::parse(trajectoryJsonString);
    uint32_t version = json["version"];
    if (version != kSpecVersion) {
      throw fmt::format("{}.traj: Wrong version {}. Expected {}",
                        trajectoryName, version, kSpecVersion);
    }
    Trajectory<SampleType> trajectory;
    from_json(json, trajectory);
    return trajectory;
  }

  /**
   * A utility for caching loaded trajectories. This allows for loading
   * trajectories only once, and then reusing them.
   */
  template <TrajectorySample SampleType>
  class TrajectoryCache {
   public:
    /**
     * Load a trajectory from the deploy directory. Choreolib expects .traj
     * files to be placed in src/main/deploy/choreo/[trajectoryName].traj.
     *
     * This method will cache the loaded trajectory and reused it if it is
     * requested again.
     *
     * @param trajectoryName the path name in Choreo, which matches the file
     *     name in the deploy directory, file extension is optional.
     * @return the loaded trajectory, or `empty std::optional` if the trajectory
     *     could not be loaded.
     * @see Choreo#LoadTrajectory(std::string_view)
     */
    static std::optional<Trajectory<SampleType>> LoadTrajectory(
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
     * @param trajectoryName the path name in Choreo, which matches the file
     *     name in the deploy directory, file extension is optional.
     * @param splitIndex the index of the split trajectory to load
     * @return the loaded trajectory, or `empty std::optional` if the trajectory
     *     could not be loaded.
     * @see Choreo#LoadTrajectory(std::string_view)
     */
    static std::optional<Trajectory<SampleType>> LoadTrajectory(
        std::string_view trajectoryName, int splitIndex) {
      std::string key = fmt::format("{}.:.{}", trajectoryName, splitIndex);

      if (!cache.contains(key)) {
        if (cache.contains(std::string{trajectoryName})) {
          cache[key] =
              cache[std::string{trajectoryName}].value().GetSplit(splitIndex);
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
    static inline std::unordered_map<std::string,
                                     std::optional<Trajectory<SampleType>>>
        cache;
  };

  /**
   * Create a factory that can be used to create AutoRoutine and AutoTrajectory.
   *
   * @tparam SampleType The type of samples in the trajectory.
   * @tparam Year The field year. Defaults to the current year.
   * @param poseSupplier A function that returns the current field-relative
   *     Pose2d of the robot.
   * @param controller A function for following the current trajectory.
   * @param mirrorTrajectory If this returns true, the path will be mirrored to
   *     the opposite side, while keeping the same coordinate system origin.
   *     This will be called every loop during the command.
   * @param driveSubsystem The drive Subsystem to require for AutoTrajectory
   *     Commands.
   * @return An AutoFactory that can be used to create AutoRoutines and
   *     AutoTrajectories.
   * @see AutoChooser using this factory with AutoChooser to generate auto
   *     routines.
   */
  template <TrajectorySample SampleType, int Year = util::kDefaultYear>
  static AutoFactory<SampleType, Year> CreateAutoFactory(
      std::function<frc::Pose2d()> poseSupplier,
      std::function<void(frc::Pose2d, SampleType)> controller,
      std::function<bool()> mirrorTrajectory, frc2::Subsystem driveSubsystem);

 private:
  static constexpr std::string_view TRAJECTORY_FILE_EXTENSION = ".traj";

  static inline std::optional<ProjectFile> LAZY_PROJECT_FILE = {};

  static inline const std::string CHOREO_DIR =
      frc::filesystem::GetDeployDirectory() + "/choreo";

  Choreo();
};

}  // namespace choreo
