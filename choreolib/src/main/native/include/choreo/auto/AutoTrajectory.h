// Copyright (c) Choreo contributors

#pragma once

#include <functional>
#include <string>
#include <string_view>
#include <utility>

#include <fmt/format.h>
#include <frc/DriverStation.h>
#include <frc/Timer.h>
#include <frc2/command/Command.h>
#include <frc2/command/Commands.h>
#include <frc2/command/button/Trigger.h>
#include <units/length.h>
#include <units/time.h>

#include "choreo/trajectory/Trajectory.h"
#include "choreo/trajectory/TrajectorySample.h"

namespace choreo {

template <choreo::TrajectorySample SampleType>
using ControllerFunction = std::function<void(frc::Pose2d, SampleType)>;

using TrajectoryLogger = std::function<void(frc::Pose2d, bool)>;

static constexpr units::meter_t DEFAULT_TOLERANCE = 3_in;

/**
 * A class that represents a trajectory that can be used in an autonomous
 * routine and have triggers based off of it.
 *
 * @tparam SampleType The type of samples in the trajectory.
 * @tparam Year The field year.
 */
template <choreo::TrajectorySample SampleType, int Year>
class AutoTrajectory {
 public:
  /**
   * Constructs an AutoTrajectory.
   *
   * @param name The trajectory name.
   * @param trajectory The trajectory samples.
   * @param poseSupplier The pose supplier.
   * @param controller The controller function.
   * @param mirrorTrajectory Getter that determines whether to mirror
   *   trajectory.
   * @param trajectoryLogger Optional trajectory logger.
   * @param driveSubsystem Drive subsystem.
   * @param loop Event loop.
   * @param newTrajectoryCallback New trajectory callback.
   */
  AutoTrajectory(std::string_view name,
                 const choreo::Trajectory<SampleType>& trajectory,
                 std::function<frc::Pose2d()> poseSupplier,
                 ControllerFunction<SampleType> controller,
                 std::function<bool()> mirrorTrajectory,
                 std::optional<TrajectoryLogger> trajectoryLogger,
                 const frc2::Subsystem& driveSubsystem, frc::EventLoop* loop,
                 std::function<void()> newTrajectoryCallback)
      : name{name},
        trajectory{trajectory},
        poseSupplier{std::move(poseSupplier)},
        controller{controller},
        mirrorTrajectory{std::move(mirrorTrajectory)},
        trajectoryLogger{std::move(trajectoryLogger)},
        driveSubsystem{driveSubsystem},
        loop(loop),
        newTrajectoryCallback{std::move(newTrajectoryCallback)},
        offTrigger(loop, [] { return false; }) {}

  /**
   * Creates a command that allocates the drive subsystem and follows the
   * trajectory using the factories control function
   *
   * @return The command that will follow the trajectory
   */
  frc2::CommandPtr Cmd() const {
    if (trajectory.samples.size() == 0) {
      return frc2::cmd::RunOnce([] {
               FRC_ReportError(frc::warn::Warning,
                               fmt::format("Trajectory {} has no samples", name);
             })
          .WithName("Trajectory_" + name);
    }
    return frc2::FunctionalCommand(
               [this] { return CmdInitiazlize(); },
               [this] { return CmdExecute(); }, [this] { return CmdEnd(); },
               [this] { return CmdIsFinished(); }, {driveSubsystem})
        .WithName("Trajectory_" + name);
  }

  /**
   * Will get the starting pose of the trajectory.
   *
   * This position is mirrored based on the mirrorTrajectory boolean supplier in
   * the factory used to make this trajectory
   *
   * @return The starting pose
   */
  std::optional<frc::Pose2d> GetInitialPose() const {
    if (trajectory.samples.size() == 0) {
      return {};
    } else {
      return trajectory.GetInitialPose(mirrorTrajectory());
    }
  }

  /**
   * Will get the ending pose of the trajectory.
   *
   * This position is mirrored based on the mirrorTrajectory boolean supplier in
   * the factory used to make this trajectory
   *
   * @return The starting pose
   */
  std::optional<frc::Pose2d> GetFinalPose() const {
    if (trajectory.samples.size() == 0) {
      return {};
    } else {
      return trajectory.GetFinalPose(mirrorTrajectory());
    }
  }

  /**
   * Returns a trigger that is true while the trajectory is scheduled.
   *
   * @return A trigger that is true while the trajectory is scheduled.
   */
  frc2::Trigger Active() {
    return frc2::Trigger(loop, [this] { return isActive; });
  }

  /**
   * Returns a trigger that is true while the command is not scheduled.
   *
   * The same as calling <code>Active().Negate()</code>.
   *
   * @return A trigger that is true while the command is not scheduled.
   */
  frc2::Trigger Inactive() { return Active().Negate(); }

  /**
   * Returns a trigger that has a rising edge when the command finishes, this
   * edge will fall again the next cycle.
   *
   * This is not a substitute for the Inactive() trigger, inactive will stay
   * true until the trajectory is scheduled again and will also be true if thus
   * trajectory has never been scheduled.
   *
   * @return A trigger that is true when the command is finished.
   */
  frc2::Trigger Done() {
    return frc2::Trigger(loop, [this] { return isDone; });
  }

  /**
   * Returns a trigger that will go true for 1 cycle when the desired time has
   * elapsed
   *
   * @param timeSinceStart The time since the command started in seconds.
   * @return A trigger that is true when timeSinceStart has elapsed.
   */
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

  /**
   * Returns a trigger that is true when the event with the given name has been
   * reached based on time.
   *
   * A warning will be printed to the DriverStation if the event is not found
   * and the trigger will always be false.
   *
   * @param eventName The name of the event.
   * @return A trigger that is true when the event with the given name has been
   * reached based on time.
   */
  frc2::Trigger AtTime(std::string_view eventName) {
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

  /**
   * Returns a trigger that is true when the robot is within toleranceMeters of
   * the given events pose.
   *
   * A warning will be printed to the DriverStation if the event is not found
   * and the trigger will always be false.
   *
   * @param eventName The name of the event.
   * @param tolerance The tolerance in meters.
   * @return A trigger that is true when the robot is within toleranceMeters of
   *   the given events pose.
   */
  frc2::Trigger AtPose(std::string_view eventName,
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

  /**
   * Returns a trigger that is true when the event with the given name has been
   * reached based on time and the robot is within toleranceMeters of the given
   * events pose.
   *
   * A warning will be printed to the DriverStation if the event is not found
   * and the trigger will always be false.
   *
   * @param eventName The name of the event.
   * @param tolerance The tolerance in meters.
   * @return A trigger that is true when the event with the given name has been
   *   reached based on time and the robot is within toleranceMeters of the
   *   given events pose.
   */
  frc2::Trigger AtTimeAndPlace(std::string_view eventName,
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
    if (trajectoryLogger.has_value()) {
      trajectoryLogger.value()(trajectory.GetPoses(), starting);
    }
  }

  void CmdInitiazlize() {
    newTrajectoryCallback();
    timer.Restart();
    isDone = false;
    isActive = true;
    timeOffset = 0.0;
    LogTrajectory(true);
  }

  void CmdExecute() {
    SampleType sample =
        trajectory.SampleAt<Year>(TimeIntoTraj(), mirrorTrajectory());
    controller(poseSupplier(), sample);
    currentSample = sample;
  }

  void CmdEnd(bool interrupted) {
    timer.Stop();
    if (interrupted) {
      controller(currentSample.GetPose(), currentSample);
    } else {
      controller(poseSupplier(), trajectory.GetFinalSample());
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

  std::string name;
  const choreo::Trajectory<SampleType>& trajectory;
  std::function<frc::Pose2d()> poseSupplier;
  ControllerFunction<SampleType> controller;
  std::function<bool()> mirrorTrajectory;
  std::optional<TrajectoryLogger> trajectoryLogger;
  const frc2::Subsystem& driveSubsystem;
  frc::EventLoop* loop;
  std::function<void()> newTrajectoryCallback;
  SampleType currentSample;

  frc::Timer timer;
  bool isDone = false;
  bool isActive = false;
  units::second_t timeOffset = 0_s;
  frc2::Trigger offTrigger;
};

}  // namespace choreo
