// Copyright (c) Choreo contributors

#pragma once

#include <frc/Timer.h>
#include <frc2/command/Command.h>
#include <frc2/command/CommandHelper.h>

#include <functional>

#include "choreo/lib/ChoreoTrajectory.h"

namespace choreolib {

using ChoreoControllerFunction =
    std::function<frc::ChassisSpeeds(frc::Pose2d, ChoreoTrajectoryState)>;

class ChoreoSwerveCommand
    : public frc2::CommandHelper<frc2::Command, ChoreoSwerveCommand> {
 public:
  ChoreoSwerveCommand(
      ChoreoTrajectory trajectory, std::function<frc::Pose2d()> poseSupplier,
      ChoreoControllerFunction controller,
      std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
      bool useAllianceColor, frc2::Requirements requirements = {});

  void Initialize() override;

  void Execute() override;

  void End(bool interrupted) override;

  bool IsFinished() override;

 private:
  frc::Timer m_timer{};
  ChoreoTrajectory m_traj;
  std::function<frc::Pose2d()> m_pose;
  ChoreoControllerFunction m_controller;
  std::function<void(frc::ChassisSpeeds)> m_outputChassisSpeeds;
  bool m_useAlliance;
};
}  // namespace choreolib
