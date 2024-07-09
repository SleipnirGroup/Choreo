// Copyright (c) Choreo contributors

#include "choreo/lib/ChoreoSwerveCommand.h"

#include <utility>

#include <frc/DriverStation.h>

using namespace choreolib;

ChoreoSwerveCommand::ChoreoSwerveCommand(
    ChoreoTrajectory trajectory, std::function<frc::Pose2d()> poseSupplier,
    ChoreoControllerFunction controller,
    std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
    std::function<bool(void)> mirrorTrajectory, frc2::Requirements requirements)
    : m_traj(std::move(trajectory)),
      m_pose(std::move(poseSupplier)),
      m_controller(std::move(controller)),
      m_outputChassisSpeeds(std::move(outputChassisSpeeds)),
      m_mirrorTrajectory(std::move(mirrorTrajectory)) {
  AddRequirements(requirements);
}

// Called when the command is initially scheduled.
void ChoreoSwerveCommand::Initialize() {
  m_timer.Restart();
}

// Called repeatedly when this Command is scheduled to run
void ChoreoSwerveCommand::Execute() {
  units::second_t currentTrajTime = m_timer.Get();
  bool mirror = m_mirrorTrajectory();
  m_outputChassisSpeeds(
      m_controller(m_pose(), m_traj.Sample(currentTrajTime, mirror)));
}

// Called once the command ends or is interrupted.
void ChoreoSwerveCommand::End(bool interrupted) {
  m_outputChassisSpeeds(frc::ChassisSpeeds{});
}

// Returns true when the command should end.
bool ChoreoSwerveCommand::IsFinished() {
  return m_timer.HasElapsed(m_traj.GetTotalTime());
}
