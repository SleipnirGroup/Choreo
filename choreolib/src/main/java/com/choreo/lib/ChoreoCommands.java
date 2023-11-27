package com.choreo.lib;

import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.FunctionalCommand;
import edu.wpi.first.wpilibj2.command.Subsystem;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.function.Supplier;

/**
 * Custom Choreo version of SwerveControllerCommand. This class is designed to be copied and
 * modified to suit individual needs.
 */
public class ChoreoCommands {

  public static Command choreoSwerveCommand(
    ChoreoTrajectory trajectory,
    Supplier<Pose2d> poseSupplier,
    PIDController xController,
    PIDController yController,
    PIDController rotationController,
    Consumer<ChassisSpeeds> outputChassisSpeeds,
    boolean useAllianceColor,
    Subsystem... requirements
  ) {
    return choreoSwerveCommand(trajectory, poseSupplier, 
    choreoSwerveController(xController, yController, rotationController),
     outputChassisSpeeds, useAllianceColor, requirements);
  }

  public static Command choreoSwerveCommand(
    ChoreoTrajectory trajectory,
    Supplier<Pose2d> poseSupplier,
    ChoreoControlFunction controller,
    Consumer<ChassisSpeeds> outputChassisSpeeds,
    boolean useAllianceColor,
    Subsystem... requirements
  ) {
    var timer = new Timer();
    return new FunctionalCommand(
      timer::restart,
      ()->{
        boolean mirror = false;
        if (useAllianceColor) {
          Optional<DriverStation.Alliance> alliance = DriverStation.getAlliance();
          mirror = alliance.isPresent() && alliance.get() == Alliance.Red;
        }
        outputChassisSpeeds.accept(controller.apply(poseSupplier.get(), trajectory.sample(timer.get(), mirror)));
      },
      (interrupted)->{
        timer.stop();
        if (interrupted) {
          outputChassisSpeeds.accept(new ChassisSpeeds());
        }
      },
      ()->timer.hasElapsed(trajectory.getTotalTime()), requirements);
  }

  public static ChoreoControlFunction choreoSwerveController(
    PIDController xController,
    PIDController yController,
    PIDController rotationController
  ) {
    return (pose, referenceState) -> {
      double xFF = referenceState.velocityX;
      double yFF = referenceState.velocityY;
      double rotationFF = referenceState.angularVelocity;

      double xFeedback = xController.calculate(pose.getX(), referenceState.x);
      double yFeedback = yController.calculate(pose.getY(), referenceState.y);
      double rotationFeedback =
          rotationController.calculate(
              pose.getRotation().getRadians(), referenceState.heading);

      return ChassisSpeeds.fromFieldRelativeSpeeds(
          xFF + xFeedback,
          yFF + yFeedback,
          rotationFF + rotationFeedback,
          pose.getRotation());
    };
  }
}
