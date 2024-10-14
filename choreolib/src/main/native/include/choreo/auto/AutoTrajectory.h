// Copyright (c) Choreo contributors

#pragma once

#include <functional>
#include <memory>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

#include <fmt/format.h>
#include <frc/DriverStation.h>
#include <frc/Timer.h>
#include <frc2/command/Command.h>
#include <frc2/command/CommandScheduler.h>
#include <frc2/command/Commands.h>
#include <frc2/command/button/Trigger.h>
#include <units/length.h>
#include <units/time.h>

#include "choreo/auto/AutoBindings.h"
#include "choreo/trajectory/Trajectory.h"
#include "choreo/trajectory/TrajectorySample.h"
#include "choreo/util/AllianceFlipperUtil.h"

namespace choreo {

template <choreo::TrajectorySample SampleType>
using TrajectoryLogger = std::function<void(Trajectory<SampleType>, bool)>;

static constexpr units::meter_t DEFAULT_TOLERANCE = 3_in;

/**
 * A struct to hold CommandsPtrs and keep track if they were triggered along the
 * path
 *
 */
struct ScheduledEvent {
  /**
   * The time through the path the command is supposed to be triggered
   */
  units::second_t triggerTime;
  /**
   * The name of the event marker
   */
  std::string name;
  /**
   * The Command Factory to get the command from
   */
  std::function<frc2::CommandPtr()> commandFactory;
  /**
   * The CommandPtr to run
   */
  frc2::CommandPtr command;
  /**
   * If the event has been triggered yet
   */
  bool hasTriggered = false;
};

/**
 * A class that represents a trajectory that can be used in an autonomous
 * routine and have triggers based off of it.
 *
 * @tparam SampleType The type of samples in the trajectory.
 * @tparam Year The field year. Defaults to the current year.
 */
template <choreo::TrajectorySample SampleType, int Year = util::kDefaultYear>
class AutoTrajectory {
 public:
  AutoTrajectory() = default;

  AutoTrajectory(const AutoTrajectory&) = delete;
  AutoTrajectory& operator=(const AutoTrajectory&) = delete;

  /**
   * The move constructor for an auto trajectory
   */
  AutoTrajectory(AutoTrajectory&&) = default;

  /**
   * The move assignment operator for an auto trajectory
   *
   * @return the moved trajectory
   */
  AutoTrajectory& operator=(AutoTrajectory&&) = default;

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
   * @param drivebaseRequirements Requirements for the drivebase subsystem
   * @param loop Event loop.
   * @param autoBindings A shared pointer to mapped choreolib markers to
   * CommandPtr factories
   */
  AutoTrajectory(std::string_view name,
                 const choreo::Trajectory<SampleType>& trajectory,
                 std::function<frc::Pose2d()> poseSupplier,
                 std::function<void(frc::Pose2d, SampleType)> controller,
                 std::function<bool()> mirrorTrajectory,
                 std::optional<TrajectoryLogger<SampleType>> trajectoryLogger,
                 frc2::Requirements drivebaseRequirements, frc::EventLoop* loop,
                 std::shared_ptr<AutoBindings> autoBindings)
      : name{name},
        trajectory{trajectory},
        poseSupplier{std::move(poseSupplier)},
        controller{controller},
        mirrorTrajectory{std::move(mirrorTrajectory)},
        trajectoryLogger{std::move(trajectoryLogger)},
        drivebaseRequirements{drivebaseRequirements},
        loop(loop),
        offTrigger(loop, [] { return false; }) {
    for (const auto& [key, cmdFactory] : autoBindings->GetBindings()) {
      AddScheduledEvent(key, cmdFactory);
    }
  }

  /**
   * Creates a command that allocates the drive subsystem and follows the
   * trajectory using the factories control function
   *
   * @return The command that will follow the trajectory
   */
  frc2::CommandPtr Cmd() {
    if (trajectory.samples.size() == 0) {
      return frc2::cmd::RunOnce([this] {
               FRC_ReportError(frc::warn::Warning,
                               "Trajectory {} has no samples", name);
             })
          .WithName("Trajectory_" + name);
    }
    return frc2::FunctionalCommand(
               [this] { return CmdInitialize(); },
               [this] {
                 CmdExecute();
                 CheckAndTriggerEvents();
               },
               [this](bool interrupted) { return CmdEnd(interrupted); },
               [this] { return CmdIsFinished(); }, drivebaseRequirements)
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
    return frc2::Trigger(loop, [this] {
      if (isActive) {
        wasJustActive = true;
        return false;
      } else if (wasJustActive) {
        wasJustActive = false;
        return true;
      }
      return false;
    });
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
                      "Trigger time cannot be negative for {}", name);
      return offTrigger;
    }

    if (timeSinceStart > TotalTime()) {
      FRC_ReportError(
          frc::warn::Warning,
          "Trigger time cannout be greater than total trajectory time for {}",
          name);
      return offTrigger;
    }

    return frc2::Trigger(loop,
                         [this, timeSinceStart, triggered = false]() mutable {
                           if (!isActive) {
                             return false;
                           }
                           if (triggered) {
                             return false;
                           }
                           if (TimeIntoTraj() >= timeSinceStart) {
                             triggered = true;
                             return true;
                           }
                           return false;
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
      trig = frc2::Trigger{trig || AtTime(event.timestamp)};
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
          trajectory
              .template SampleAt<Year>(event.timestamp, mirrorTrajectory())
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
  units::second_t TimeIntoTraj() const { return timer.Get() + timeOffset; }

  units::second_t TotalTime() const { return trajectory.GetTotalTime(); }

  void LogTrajectory(bool starting) {
    if (trajectoryLogger.has_value()) {
      trajectoryLogger.value()(
          mirrorTrajectory() ? trajectory.template Flipped<Year>() : trajectory,
          starting);
    }
  }

  void CmdInitialize() {
    timer.Restart();
    isActive = true;
    timeOffset = 0.0_s;
    for (auto& event : scheduledEvents) {
      event.hasTriggered = false;
    }
    LogTrajectory(true);
  }

  void CmdExecute() {
    auto sampleOpt =
        trajectory.template SampleAt<Year>(TimeIntoTraj(), mirrorTrajectory());
    controller(poseSupplier(), sampleOpt.value());
    currentSample = sampleOpt.value();
  }

  void CmdEnd(bool interrupted) {
    timer.Stop();
    if (interrupted) {
      controller(currentSample.GetPose(), currentSample);
    } else {
      controller(poseSupplier(), trajectory.GetFinalSample().value());
    }
    isActive = false;
    LogTrajectory(false);
  }

  bool CmdIsFinished() { return TimeIntoTraj() > TotalTime(); }

  frc2::Trigger AtPose(frc::Pose2d pose, units::meter_t tolerance) {
    frc::Translation2d checkedTrans =
        mirrorTrajectory()
            ? frc::Translation2d{util::fieldLength - pose.Translation().X(),
                                 pose.Translation().Y()}
            : pose.Translation();
    return frc2::Trigger{
        loop, [this, checkedTrans, tolerance] {
          frc::Translation2d currentTrans = poseSupplier().Translation();
          return currentTrans.Distance(checkedTrans) < tolerance;
        }};
  }

  void AddScheduledEvent(std::string_view eventName,
                         std::function<frc2::CommandPtr()> cmdFactory) {
    for (const auto& event : trajectory.GetEvents(eventName)) {
      scheduledEvents.push_back({event.timestamp, std::string(eventName),
                                 cmdFactory, frc2::cmd::None(), false});
    }
  }

  void CheckAndTriggerEvents() {
    auto currentTime = TimeIntoTraj();
    for (auto& event : scheduledEvents) {
      if (!event.hasTriggered && isActive && currentTime >= event.triggerTime) {
        event.hasTriggered = true;
        event.command = event.commandFactory();
        event.command.Schedule();
      }
    }
  }

  std::string name;
  choreo::Trajectory<SampleType> trajectory;
  std::function<frc::Pose2d()> poseSupplier;
  std::function<void(frc::Pose2d, SampleType)> controller;
  std::function<bool()> mirrorTrajectory;
  std::optional<TrajectoryLogger<SampleType>> trajectoryLogger;
  frc2::Requirements drivebaseRequirements;
  frc::EventLoop* loop;
  std::vector<ScheduledEvent> scheduledEvents;
  SampleType currentSample;

  frc::Timer timer;
  bool isActive = false;
  bool wasJustActive = false;
  units::second_t timeOffset = 0_s;
  frc2::Trigger offTrigger;
};

}  // namespace choreo
