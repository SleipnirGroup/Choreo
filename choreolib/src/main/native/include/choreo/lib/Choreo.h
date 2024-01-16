// Copyright (c) Choreo contributors

#pragma once

#include <frc/controller/PIDController.h>
#include <frc/kinematics/ChassisSpeeds.h>
#include <frc2/command/CommandPtr.h>
#include <frc2/command/Requirements.h>

#include <functional>
#include <string>
#include <string_view>
#include <vector>

#include "ChoreoTrajectory.h"

namespace choreolib {

/// A type alias to constrain the controller function
using ChoreoControllerFunction =
    std::function<frc::ChassisSpeeds(frc::Pose2d, ChoreoTrajectoryState)>;

/// A class that handles loading choreo trajectories and creating command
/// factories for following trajectories
class Choreo {
 public:
  /**
   * Load a trajectory from the deploy directory. ChoreoLib expects .traj files
   *  to be placed in src/main/deploy/choreo/[trajName].traj .
   *
   * @param trajName the path name in Choreo, which matches the file name in the
   *  deploy directory. Do not include ".traj" here.
   * @return the loaded trajectory, will throw runtime error if the file doesn't
   *  exist
   */
  static ChoreoTrajectory GetTrajectory(std::string_view trajName);

  /**
   * Loads the split parts of the specified trajectory.
   *
   * ChoreoLib expects split .traj files to be placed in
   * src/main/deploy/choreo/[trajName].[segmentNumber].traj.
   *
   * This method determines the number of parts to load by counting the files
   * that match the pattern "trajName.X.traj", where X is a string of digits.
   * Let this count be N. It then attempts to load "trajName.1.traj" through
   * "trajName.N.traj", consecutively counting up.
   *
   * @param trajName the path name in Choreo. Do not include ".traj" here.
   * @return The array of segments, in order.
   * @throws std::runtime_error If any files cannot be loaded.
   */
  static std::vector<ChoreoTrajectory> GetTrajectoryGroup(
      std::string_view trajName);

  /**
   * Creates a CommandPtr that commands your drivebase to follow a Choreo
   *  trajectory
   *
   * @param trajectory a ChoreoTrajectory to follow
   * @param poseSupplier a function that returns a Pose2d of the robots current
   *  position
   * @param xController a PIDController that controls the feedback on the global
   *  x position of the robot
   * @param yController a PIDController that controls the feedback on the global
   *  y position of the robot
   * @param rotationController a PIDController that controls the feedback on the
   *  global heading of the robot
   * @param outputChassisSpeeds a function that consuming the calculated robot
   *  relative ChassisSpeeds
   * @param mirrorTrajectory If this returns true, the path will be mirrored to
   * the opposite side, while keeping the same coordinate system origin. This
   * will be called every loop during the command.
   * @param requirements the frc2::Requirements of the command
   * @return an frc2::CommandPtr containing the command that will command your
   *  drivebase to follow a trajectory
   */
  static frc2::CommandPtr ChoreoSwerveCommandFactory(
      ChoreoTrajectory trajectory, std::function<frc::Pose2d()> poseSupplier,
      frc::PIDController xController, frc::PIDController yController,
      frc::PIDController rotationController,
      std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
      std::function<bool(void)> mirrorTrajectory,
      frc2::Requirements requirements = {});

  /**
   * Creates a CommandPtr that commands your drivebase to follow a Choreo
   *  trajectory
   *
   * @param trajectory a ChoreoTrajectory to follow
   * @param poseSupplier a function that returns a Pose2d of the robots current
   *  position
   * @param controller a ChoreoControllerFunction that handles the feedback of
   *  the robots position
   * @param outputChassisSpeeds a function that consuming the calculated robot
   *  relative ChassisSpeeds
   * @param mirrorTrajectory If this returns true, the path will be mirrored to
   * the opposite side, while keeping the same coordinate system origin. This
   * will be called every loop during the command.
   * @param requirements the frc2::Requirements of the command
   * @return an frc2::CommandPtr containing the command that will command your
   *  drivebase to follow a trajectory
   */
  static frc2::CommandPtr ChoreoSwerveCommandFactory(
      ChoreoTrajectory trajectory, std::function<frc::Pose2d()> poseSupplier,
      ChoreoControllerFunction controller,
      std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
      std::function<bool(void)> mirrorTrajectory,
      frc2::Requirements requirements = {});

  /**
   * Creates a ChoreoControllerFunction handles the feedback of the drivebase
   *  position
   * @param xController a PIDController that controls the feedback on the global
   *  x position of the robot
   * @param yController a PIDController that controls the feedback on the global
   *  y position of the robot
   * @param rotationController a PIDController that controls the feedback on the
   *  global heading of the robot
   * @return a ChoreoControllerFunction that handles the feedback of the
   *  drivebase position
   */
  static ChoreoControllerFunction ChoreoSwerveController(
      frc::PIDController xController, frc::PIDController yController,
      frc::PIDController rotationController);
};
}  // namespace choreolib
