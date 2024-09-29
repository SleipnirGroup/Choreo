// Copyright (c) Choreo contributors

#pragma once

#include <functional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <utility>

#include <frc/RobotBase.h>

#include "choreo/Choreo.h"
#include "choreo/auto/AutoLoop.h"

namespace choreo {

class AutoBindings {
 public:
  AutoBindings() = default;
  AutoBindings(const AutoBindings&) = delete;
  AutoBindings& operator=(const AutoBindings&) = delete;
  AutoBindings(AutoBindings&&) = default;
  AutoBindings& operator=(AutoBindings&&) = default;

  AutoBindings Bind(std::string_view name, frc2::CommandPtr cmd) && {
    bindings.emplace(name, std::move(cmd));
    return std::move(*this);
  }

  void Merge(AutoBindings&& other) {
    for (auto& [key, value] : other.bindings) {
      bindings.emplace(std::move(key), std::move(value));
    }
    other.bindings.clear();
  }

  const std::unordered_map<std::string, frc2::CommandPtr>& GetBindings() const {
    return bindings;
  }

 private:
  std::unordered_map<std::string, frc2::CommandPtr> bindings;
};

template <choreo::TrajectorySample SampleType>
class AutoFactory {
 public:
  AutoFactory(std::function<frc::Pose2d()> poseSupplier,
              ChoreoControllerFunction<SampleType> controller,
              std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
              std::function<bool()> mirrorTrajectory,
              const frc2::Subsystem& driveSubsystem, AutoBindings bindings,
              std::optional<TrajectoryLogger> trajectoryLogger)
      : poseSupplier{std::move(poseSupplier)},
        controller{controller},
        outputChassisSpeeds{std::move(outputChassisSpeeds)},
        mirrorTrajectory{std::move(mirrorTrajectory)},
        driveSubsystem{driveSubsystem},
        autoBindings{std::move(bindings)},
        trajectoryLogger{std::move(trajectoryLogger)} {}

  AutoLoop<SampleType> NewLoop() const {
    // Clear cache in simulation to allow a form of "hot-reloading" trajectories
    if (RobotBase::IsSimulation()) {
      ClearCache();
    }

    return AutoLoop<SampleType>();
  }

  AutoTrajectory<SampleType> Trajectory(std::string_view trajectoryName,
                                        AutoLoop<SampleType> loop) const {
    std::optional<choreo::Trajectory<SampleType>> optTraj =
        Choreo::LoadTrajectory<SampleType>(trajectoryName);
    choreo::Trajectory<SampleType> trajectory;
    if (optTraj.has_value()) {
      trajectory = optTraj.value();
    } else {
      FRC_ReportError(frc::warn::Warning, "Could not load trajectory: {}",
                      trajectoryName);
    }
    AutoTrajectory<SampleType> autoTraj{
        trajectoryName,   trajectory,          poseSupplier,
        controller,       outputChassisSpeeds, mirrorTrajectory,
        trajectoryLogger, driveSubsystem,      loop.GetLoop(),
        autoBindings,     loop.OnNewTrajectory};
    loop.AddTrajectory(autoTraj);
    return autoTraj;
  }

  AutoTrajectory<SampleType> Trajectory(std::string_view trajectoryName,
                                        int splitIndex,
                                        AutoLoop<SampleType> loop) const {
    std::optional<choreo::Trajectory<SampleType>> optTraj =
        Choreo::LoadTrajectory<SampleType>(trajectoryName);
    choreo::Trajectory<SampleType> trajectory;
    if (optTraj.has_value()) {
      trajectory = optTraj.value();
    } else {
      FRC_ReportError(frc::warn::Warning, "Could not load trajectory: {}",
                      trajectoryName);
    }
    return Trajectory(trajectory, loop);
  }

  AutoTrajectory<SampleType> Trajectory(
      choreo::Trajectory<SampleType> trajectory,
      AutoLoop<SampleType> loop) const {
    AutoTrajectory<SampleType> autoTraj{
        trajectory.name,  trajectory,          poseSupplier,
        controller,       outputChassisSpeeds, mirrorTrajectory,
        trajectoryLogger, driveSubsystem,      loop.GetLoop(),
        autoBindings,     loop.OnNewTrajectory};
    loop.AddTrajectory(autoTraj);
    return autoTraj;
  }

  void Bind(std::string_view name, frc2::CommandPtr cmd) {
    autoBindings = std::move(autoBindings).Bind(name, cmd);
  }

 private:
  std::function<frc::Pose2d()> poseSupplier;
  ChoreoControllerFunction<SampleType> controller;
  std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds;
  std::function<bool()> mirrorTrajectory;
  const frc2::Subsystem& driveSubsystem;
  AutoBindings autoBindings{};
  std::optional<TrajectoryLogger> trajectoryLogger;
};

}  // namespace choreo
