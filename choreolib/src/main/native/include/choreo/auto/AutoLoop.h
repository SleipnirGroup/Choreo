// Copyright (c) Choreo contributors

#pragma once

#include <functional>
#include <utility>
#include <vector>

#include "choreo/auto/AutoTrajectory.h"

namespace choreo {

template <choreo::TrajectorySample SampleType>
class AutoLoop {
 public:
  AutoLoop() = default;

  explicit AutoLoop(frc::EventLoop loop) : loop{std::move(loop)} {}

  void Poll() {
    if (!frc::DriverStation::IsAutonomousEnabled() || isKilled) {
      isActive = false;
      return;
    }
    loop.Poll();
    isActive = true;
  }

  frc::EventLoop* GetLoop() { return &loop; }

  void Reset() {
    isActive = false;
    OnNewTrajectory();
  }

  void Kill() {
    frc2::CommandScheduler::GetInstance().CancelAll();
    if (isKilled) {
      return;
    }
    Reset();
    FRC_ReportError(frc::warn::Warning, "Killed an Auto Loop");
    isKilled = true;
  }

  frc2::CommandPtr Cmd() {
    return frc2::cmd::Run([this] { Poll(); })
        .FinallyDo([this] { Reset(); })
        .Until([this] { return !frc::DriverStation::IsAutonomousEnabled(); })
        .WithName("AutoLoop");
  }

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
