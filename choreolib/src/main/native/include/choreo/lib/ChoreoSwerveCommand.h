// Copyright (c) Choreo contributors

#pragma once

#include <frc/Timer.h>
#include <frc2/command/Command.h>
#include <frc2/command/CommandHelper.h>

#include <functional>

#include "choreo/lib/ChoreoTrajectory.h"

namespace choreolib {

/// A type alias to constrain the controller function
using ChoreoControllerFunction =
    std::function<frc::ChassisSpeeds(frc::Pose2d, ChoreoTrajectoryState)>;

/**
 * A frc2::Command that controls a swerve drivetrain using ChoreoTrajectories
 */
class ChoreoSwerveCommand
    : public frc2::CommandHelper<frc2::Command, ChoreoSwerveCommand> {
 public:
  /**
   * Creates a new ChoreoSwerveCommand that controls a swerve drivetrain
   *
   * @param trajectory the ChoreoTrajectory to follow
   * @param poseSupplier a function that supplies the current pose of the robot
   * @param controller a function that consumes a pose and the current
   *  trajectory state, and supplies back robot relative ChassisSpeeds
   * @param outputChassisSpeeds a function that consumes robot relative
   *  ChassisSpeeds
   * @param mirrorTrajectory If this returns true, the path will be mirrored to
   * the opposite side, while keeping the same coordinate system origin. This
   * will be called every loop during the command.
   * @param requirements subsystem requirements
   */
  ChoreoSwerveCommand(
      ChoreoTrajectory trajectory, std::function<frc::Pose2d()> poseSupplier,
      ChoreoControllerFunction controller,
      std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
      std::function<bool(void)> mirrorTrajectory,
      frc2::Requirements requirements = {});

  /// Runs once before the first call to Execute()
  void Initialize() override;

  /// Runs every robot periodic loop while the command is running.
  void Execute() override;

  /// Runs once after IsFinished() returns true
  void End(bool interrupted) override;

  /// Command will end once this returns true
  bool IsFinished() override;

 private:
  frc::Timer m_timer;
  ChoreoTrajectory m_traj;
  std::function<frc::Pose2d()> m_pose;
  ChoreoControllerFunction m_controller;
  std::function<void(frc::ChassisSpeeds)> m_outputChassisSpeeds;
  std::function<bool(void)> m_mirrorTrajectory;
};
}  // namespace choreolib
