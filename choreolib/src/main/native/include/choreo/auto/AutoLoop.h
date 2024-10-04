// Copyright (c) Choreo contributors

#pragma once

#include <functional>
#include <utility>
#include <vector>

#include "choreo/auto/AutoTrajectory.h"

namespace choreo {

/**
 * A loop that represents an autonomous routine.
 *
 * This loop is used to handle autonomous trigger logic and schedule commands.
 * This loop should **not** be shared across multiple autonomous routines.
 *
 * @tparam SampleType The type of samples in the trajectory.
 */
template <choreo::TrajectorySample SampleType>
class AutoLoop {
 public:
  AutoLoop() = default;

  /**
   * A constructor to be used when inhereting this class to instantiate a custom
   * inner loop
   *
   * @param loop The inner EventLoop
   */
  explicit AutoLoop(frc::EventLoop loop) : loop{std::move(loop)} {}

  /**
   * Polls the loop. Should be called in the autonomous periodic method.
   */
  void Poll() {
    if (!frc::DriverStation::IsAutonomousEnabled() || isKilled) {
      isActive = false;
      return;
    }
    loop.Poll();
    isActive = true;
  }

  /**
   * Gets the event loop that this loop is using.
   *
   * @return The event loop that this loop is using.
   */
  frc::EventLoop* GetLoop() { return &loop; }

  /**
   * Resets the loop. This can either be called on auto init or auto end to
   * reset the loop incase you run it again. If this is called on a loop that
   * doesn't need to be reset it will do nothing.
   */
  void Reset() {
    isActive = false;
    OnNewTrajectory();
  }

  /**
   * Kills the loop and prevents it from running again.
   */
  void Kill() {
    frc2::CommandScheduler::GetInstance().CancelAll();
    if (isKilled) {
      return;
    }
    Reset();
    FRC_ReportError(frc::warn::Warning, "Killed an Auto Loop");
    isKilled = true;
  }

  /**
   * Creates a command that will poll this event loop and reset it when it is
   * cancelled.
   *
   * @return A command that will poll this event loop and reset it when it is
   * cancelled.
   * @see #Cmd(std::function<bool()>) A version of this method that takes a
   *   condition to finish the loop.
   */
  frc2::CommandPtr Cmd() {
    return frc2::cmd::Run([this] { Poll(); })
        .FinallyDo([this] { Reset(); })
        .Until([this] { return !frc::DriverStation::IsAutonomousEnabled(); })
        .WithName("AutoLoop");
  }

  /**
   * Creates a command that will poll this event loop and reset it when it is
   * finished or canceled.
   *
   * @param finishCondition A condition that will finish the loop when it is
   *   true.
   * @return A command that will poll this event loop and reset it when it is
   *   finished or canceled.
   * @see #Cmd() A version of this method that doesn't take a condition and
   *   never finishes.
   */
  frc2::CommandPtr Cmd(std::function<bool()> finishCondition) {
    return frc2::cmd::Run([this] { Poll(); })
        .FinallyDo([this] { Reset(); })
        .Until([this, finishCondition] {
          return !frc::DriverStation::IsAutonomousEnabled() ||
                 finishCondition();
        })
        .WithName("AutoLoop");
  }

 private:
  void OnNewTrajectory() {
    for (AutoTrajectory<SampleType> trajectory : trajectories) {
      trajectory.OnNewTrajectory();
    }
  }

  frc2::Trigger Enabled() {
    return frc2::Trigger{loop, [this] {
                           return isActive &&
                                  frc::DriverStation::IsAutonomousEnabled();
                         }};
  }

  void AddTrajectory(AutoTrajectory<SampleType> trajectory) {
    trajectories.add(std::move(trajectory));
  }

  std::vector<AutoTrajectory<SampleType>> trajectories;
  frc::EventLoop loop;
  bool isActive = false;
  bool isKilled = false;
};

}  // namespace choreo
