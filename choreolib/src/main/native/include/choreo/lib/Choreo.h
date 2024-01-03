// Copyright (c) Choreo contributors

#pragma once

#include <frc/controller/PIDController.h>
#include <frc/kinematics/ChassisSpeeds.h>
#include <frc2/command/CommandPtr.h>
#include <frc2/command/Requirements.h>

#include <functional>
#include <string>

#include "ChoreoTrajectory.h"

namespace choreolib {

using ChoreoControllerFunction =
    std::function<frc::ChassisSpeeds(frc::Pose2d, ChoreoTrajectoryState)>;

class Choreo {
 public:
  static ChoreoTrajectory GetTrajectory(std::string trajName);
  static frc2::CommandPtr ChoreoSwerveCommandFactory(
      ChoreoTrajectory trajectory, std::function<frc::Pose2d()> poseSupplier,
      frc::PIDController xController, frc::PIDController yController,
      frc::PIDController rotationController,
      std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
      bool useAllianceColor, frc2::Requirements requirements = {});
  static frc2::CommandPtr ChoreoSwerveCommandFactory(
      ChoreoTrajectory trajectory, std::function<frc::Pose2d()> poseSupplier,
      ChoreoControllerFunction controller,
      std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
      bool useAllianceColor, frc2::Requirements requirements = {});
  static ChoreoControllerFunction ChoreoSwerveController(
      frc::PIDController xController, frc::PIDController yController,
      frc::PIDController rotationController);

 private:
};
}  // namespace choreolib
