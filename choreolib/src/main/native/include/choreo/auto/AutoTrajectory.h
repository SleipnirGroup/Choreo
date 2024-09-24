// Copyright (c) Choreo contributors

#pragma once

#include <functional>
#include <string>

#include <frc/DriverStation.h>
#include <frc/Timer.h>
#include <frc/kinematics/ChassisSpeeds.h>
#include <frc2/command/Command.h>
#include <frc2/command/Commands.h>
#include <frc2/command/button/Trigger.h>
#include <units/length.h>
#include <units/time.h>

#include "choreo/trajectory/EventMarker.h"
#include "choreo/trajectory/Trajectory.h"
#include "choreo/trajectory/TrajectorySample.h"

namespace choreo {

template <choreo::TrajectorySample SampleType>
using ChoreoControllerFunction =
    std::function<frc::ChassisSpeeds(frc::Pose2d, SampleType)>;

using TrajectoryLogger = std::function<void(frc::Pose2d, bool)>;

static constexpr units::meter_t DEFAULT_TOLERANCE = 3_in;
static constexpr frc::ChassisSpeeds DEFAULT_CHASSIS_SPEEDS =
    frc::ChassisSpeeds{};

template <choreo::TrajectorySample SampleType, int Year>
class AutoTrajectory {
 public:
  AutoTrajectory(const std::string& name,
                 const choreo::Trajectory<SampleType>& trajectory,
                 std::function<frc::Pose2d()> poseSupplier,
                 ChoreoControllerFunction<SampleType> controller,
                 std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
                 std::function<bool()> mirrorTrajectory,
                 std::optional<TrajectoryLogger> trajLogger,
                 const frc2::Subsystem& driveSubsystem, frc::EventLoop* loop,
                 // bindings,
                 std::function<void()> newTrajCallback)
      : name(name),
        trajectory(trajectory),
        poseSupplier(poseSupplier),
        controller(controller),
        outputChassisSpeeds(outputChassisSpeeds),
        mirrorTrajectory(mirrorTrajectory),
        trajLogger(trajLogger),
        driveSubsystem(driveSubsystem),
        loop(loop),
        newTrajCallback(newTrajCallback),
        offTrigger(loop, [] { return false; }) {}

  frc2::CommandPtr Cmd() const {
    if (trajectory.samples.size() == 0) {
      return frc2::cmd::RunOnce([] {
               FRC_ReportError(frc::warn::Warning,
                               "Trajectory " + name + " has no samples");
             })
          .WithName("Trajectory_" + name);
    }
    return frc2::FunctionalCommand(
               [this] { return CmdInitiazlize(); },
               [this] { return CmdExecute(); }, [this] { return CmdEnd(); },
               [this] { return CmdIsFinished(); }, {driveSubsystem})
        .WithName("Trajectory_" + name);
  }

  std::optional<frc::Pose2d> GetInitialPose() const {
    if (trajectory.samples.size() == 0) {
      return {};
    } else {
      return trajectory.GetInitialPose(mirrorTrajectory());
    }
  }

  std::optional<frc::Pose2d> GetFinalPose() const {
    if (trajectory.samples.size() == 0) {
      return {};
    } else {
      return trajectory.GetFinalPose(mirrorTrajectory());
    }
  }

  frc2::Trigger Active() {
    return frc2::Trigger(loop, [this] { return isActive; });
  }

  frc2::Trigger Inactive() { return Active().Negate(); }

  frc2::Trigger Done() {
    return frc2::Trigger(loop, [this] { return isDone; });
  }

  frc2::Trigger AtTime(units::second_t timeSinceStart) {
    if (timeSinceStart < 0_s) {
      FRC_ReportError(frc::warn::Warning,
                      "Trigger time cannot be negative for" + name);
      return offTrigger;
    }

    if (timeSinceStart > TotalTime()) {
      FRC_ReportError(
          frc::warn::Warning,
          "Trigger time cannout be greater than total trajectory time for " +
              name);
      return offTrigger;
    }

    return frc2::Trigger(
        loop, [this, timeSinceStart, lastTimestamp = timer.Get()]() mutable {
          units::second_t nowTimestamp = timer.Get();
          bool shouldTrigger =
              lastTimestamp < nowTimestamp && nowTimestamp >= timeSinceStart;
          lastTimestamp = nowTimestamp;
          return shouldTrigger;
        });
  }

  frc2::Trigger AtTime(const std::string& eventName) {
    bool foundEvent = false;
    frc2::Trigger trig = offTrigger;

    for (const auto& event : trajectory.GetEvents(eventName)) {
      trig = frc2::Trigger(trig || AtTime(event.timestamp));
      foundEvent = true;
    }

    if (!foundEvent) {
      FRC_ReportError(frc::warn::Warning, "Event \"{}\" not found for {}",
                      eventName, name);
    }

    return trig;
  }

  frc2::Trigger AtPose(const std::string& eventName,
                       units::meter_t tolerance = DEFAULT_TOLERANCE) {
    bool foundEvent = false;
    frc2::Trigger trig = offTrigger;

    for (const auto& event : trajectory.GetEvents(eventName)) {
      frc::Pose2d pose =
          trajectory.SampleAt<Year>(event.timestamp, mirrorTrajectory())
              .GetPose();
      trig = frc2::Trigger(trig || AtPose(pose, tolerance));
      foundEvent = true;
    }

    if (!foundEvent) {
      FRC_ReportError(frc::warn::Warning, "Event \"{}\" not found for {}",
                      eventName, name);
    }

    return trig;
  }

  frc2::Trigger AtTimeAndPlace(const std::string& eventName,
                               units::meter_t tolerance = DEFAULT_TOLERANCE) {
    return frc2::Trigger{AtTime(eventName) && AtPose(eventName, tolerance)};
  }

 private:
  void OnNewTrajectory() {
    isDone = false;
    isActive = false;
  }

  units::second_t TimeIntoTraj() { return timer.Get() + timeOffset; }

  units::second_t TotalTime() { return trajectory.GetTotalTime(); }

  void LogTrajectory(bool starting) {
    if (trajLogger.has_value()) {
      trajLogger.value()(trajectory.GetPoses(), starting);
    }
  }

  void CmdInitiazlize() {
    newTrajCallback();
    timer.Restart();
    isDone = false;
    isActive = true;
    timeOffset = 0.0;
    LogTrajectory(true);
  }

  void CmdExecute() {
    SampleType sample =
        trajectory.SampleAt<Year>(TimeIntoTraj(), mirrorTrajectory());
    frc::ChassisSpeeds chassisSpeeds = DEFAULT_CHASSIS_SPEEDS;
    chassisSpeeds = controller(poseSupplier(), sample);
    outputChassisSpeeds(chassisSpeeds);
  }

  void CmdEnd(bool interrupted) {
    timer.Stop();
    if (interrupted) {
      outputChassisSpeeds(frc::ChassisSpeeds{});
    } else {
      outputChassisSpeeds(trajectory.GetFinalSample().GetChassisSpeeds());
    }
    isDone = true;
    isActive = false;
    LogTrajectory(false);
  }

  bool CmdIsFinished() { return TimeIntoTraj() > TotalTime(); }

  frc2::Trigger AtPose(frc::Pose2d pose, units::meter_t tolerance) {
    frc::Translation2d checkedTrans =
        mirrorTrajectory()
            ? frc::Translation2d{16.5410515_m - pose.Translation().X(),
                                 pose.Translation().Y}
            : pose.Translation();
    return frc2::Trigger{
        loop, [this, checkedTrans, tolerance] {
          frc::Translation2d currentTrans = poseSupplier().Translation();
          return currentTrans.Distance(checkedTrans) < tolerance;
        }};
  }

  const std::string& name;
  const choreo::Trajectory<SampleType>& trajectory;
  std::function<frc::Pose2d()> poseSupplier;
  ChoreoControllerFunction<SampleType> controller;
  std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds;
  std::function<bool()> mirrorTrajectory;
  std::optional<TrajectoryLogger> trajLogger;
  const frc2::Subsystem& driveSubsystem;
  frc::EventLoop* loop;
  // bindings;
  std::function<void()> newTrajCallback;

  frc::Timer timer;
  bool isDone{false};
  bool isActive{false};
  units::second_t timeOffset = 0_s;
  frc2::Trigger offTrigger;
};
}  // namespace choreo
