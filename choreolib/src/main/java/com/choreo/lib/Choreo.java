package com.choreo.lib;

import com.google.gson.Gson;
import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj.Filesystem;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.FunctionalCommand;
import edu.wpi.first.wpilibj2.command.Subsystem;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.function.Supplier;

/** Utilities to load and follow ChoreoTrajectories */
public class Choreo {
  private static final Gson gson = new Gson();

  /**
   * Load a trajectory from the deploy directory. Choreolib expects .traj files to be placed in
   * src/main/deploy/choreo/[trajName].traj .
   *
   * @param trajName the path name in Choreo, which matches the file name in the deploy directory.
   *     Do not include ".traj" here.
   * @return the loaded trajectory, or null if the trajectory could not be loaded.
   */
  public static ChoreoTrajectory getTrajectory(String trajName) {
    var traj_dir = new File(Filesystem.getDeployDirectory(), "choreo");
    var traj_file = new File(traj_dir, trajName + ".traj");

    return loadFile(traj_file);
  }

  private static ChoreoTrajectory loadFile(File path) {
    try {
      var reader = new BufferedReader(new FileReader(path));
      ChoreoTrajectory traj = gson.fromJson(reader, ChoreoTrajectory.class);

      return traj;
    } catch (Exception ex) {
      DriverStation.reportError(ex.getMessage(), ex.getStackTrace());
    }
    return null;
  }

  /**
   * Create a command to follow a Choreo path.
   *
   * @param trajectory The trajectory to follow. Use Choreo.getTrajectory(String trajName) to load
   *     this from the deploy directory.
   * @param poseSupplier A function that returns the current field-relative pose of the robot.
   * @param xController A generic controller for field-relative X translation, where the first
   *     argument is the measured X position in meters, the second argument is the X setpoint in
   *     meters, and the output is X velocity in m/s.
   * @param yController A generic controller for field-relative Y translation, where the first
   *     argument is the measured Y position in meters, the second argument is the Y setpoint in
   *     meters, and the output is Y velocity in m/s.
   * @param rotationController A generic controller for robot angle, where the first argument is the
   *     measured angle in radians, the second argument is the angle setpoint i
   * @param outputChassisSpeeds A function that consumes the target robot-relative chassis speeds
   *     and commands them to the robot.
   * @param useAllianceColor Whether or not to mirror the path based on alliance (this assumes the
   *     path is created for the blue alliance)
   * @param requirements The subsystem(s) to require, typically your drive subsystem only.
   * @return A command that follows a Choreo path.
   */
  public static Command choreoSwerveCommand(
      ChoreoTrajectory trajectory,
      Supplier<Pose2d> poseSupplier,
      BiFunction<Double, Double, Double> xController,
      BiFunction<Double, Double, Double> yController,
      BiFunction<Double, Double, Double> rotationController,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      boolean useAllianceColor,
      Subsystem... requirements) {
    return choreoSwerveCommand(
        trajectory,
        poseSupplier,
        choreoSwerveController(xController, yController, rotationController),
        outputChassisSpeeds,
        useAllianceColor,
        requirements);
  }

  /**
   * Create a command to follow a Choreo path.
   *
   * @param trajectory The trajectory to follow. Use Choreo.getTrajectory(String trajName) to load
   *     this from the deploy directory.
   * @param poseSupplier A function that returns the current field-relative pose of the robot.
   * @param xController A PIDController for field-relative X translation (input: X error in meters,
   *     output: m/s).
   * @param yController A PIDController for field-relative Y translation (input: Y error in meters,
   *     output: m/s).
   * @param rotationController A PIDController for robot rotation (input: heading error in radians,
   *     output: rad/s). This controller will have its continuous input range set to -pi..pi by
   *     ChoreoLib.
   * @param outputChassisSpeeds A function that consumes the target robot-relative chassis speeds
   *     and commands them to the robot.
   * @param useAllianceColor Whether or not to mirror the path based on alliance (this assumes the
   *     path is created for the blue alliance)
   * @param requirements The subsystem(s) to require, typically your drive subsystem only.
   * @return A command that follows a Choreo path.
   */
  public static Command choreoSwerveCommand(
      ChoreoTrajectory trajectory,
      Supplier<Pose2d> poseSupplier,
      PIDController xController,
      PIDController yController,
      PIDController rotationController,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      boolean useAllianceColor,
      Subsystem... requirements) {
    return choreoSwerveCommand(
        trajectory,
        poseSupplier,
        choreoSwerveController(xController, yController, rotationController),
        outputChassisSpeeds,
        useAllianceColor,
        requirements);
  }

  /**
   * Create a command to follow a Choreo path.
   *
   * @param trajectory The trajectory to follow. Use Choreo.getTrajectory(String trajName) to load
   *     this from the deploy directory.
   * @param poseSupplier A function that returns the current field-relative pose of the robot.
   * @param controller A ChoreoControlFunction to follow the current trajectory state. Use
   *     ChoreoCommands.choreoSwerveController(PIDController xController, PIDController yController,
   *     PIDController rotationController) to create one using PID controllers for each degree of
   *     freedom. You can also pass in a function with the signature (Pose2d currentPose,
   *     ChoreoTrajectoryState referenceState) -> ChassisSpeeds to implement a custom follower (i.e.
   *     for logging).
   * @param outputChassisSpeeds A function that consumes the target robot-relative chassis speeds
   *     and commands them to the robot.
   * @param useAllianceColor Whether or not to mirror the path based on alliance (this assumes the
   *     path is created for the blue alliance)
   * @param requirements The subsystem(s) to require, typically your drive subsystem only.
   * @return A command that follows a Choreo path.
   */
  public static Command choreoSwerveCommand(
      ChoreoTrajectory trajectory,
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      boolean useAllianceColor,
      Subsystem... requirements) {
    var timer = new Timer();
    return new FunctionalCommand(
        timer::restart,
        () -> {
          boolean mirror = false;
          if (useAllianceColor) {
            Optional<DriverStation.Alliance> alliance = DriverStation.getAlliance();
            mirror = alliance.isPresent() && alliance.get() == Alliance.Red;
          }
          outputChassisSpeeds.accept(
              controller.apply(poseSupplier.get(), trajectory.sample(timer.get(), mirror)));
        },
        (interrupted) -> {
          timer.stop();
          if (interrupted) {
            outputChassisSpeeds.accept(new ChassisSpeeds());
          }
        },
        () -> timer.hasElapsed(trajectory.getTotalTime()),
        requirements);
  }

  /**
   * Creates a control function for following a ChoreoTrajectoryState.
   *
   * @param xController A generic controller for field-relative X translation, where the first
   *     argument is the measured X position in meters, the second argument is the X setpoint in
   *     meters, and the output is X velocity in m/s.
   * @param yController A generic controller for field-relative Y translation, where the first
   *     argument is the measured Y position in meters, the second argument is the Y setpoint in
   *     meters, and the output is Y velocity in m/s.
   * @param rotationController A generic controller for robot angle, where the first argument is the
   *     measured angle in radians, the second argument is the angle setpoint in radians, and the
   *     output is angular velocity in rad/s. Keep in mind angular wrapping!
   * @return A ChoreoControlFunction to track ChoreoTrajectoryStates. This function returns
   *     robot-relative ChassisSpeeds.
   */
  public static ChoreoControlFunction choreoSwerveController(
      BiFunction<Double, Double, Double> xController,
      BiFunction<Double, Double, Double> yController,
      BiFunction<Double, Double, Double> rotationController) {
    return (pose, referenceState) -> {
      double xFF = referenceState.velocityX;
      double yFF = referenceState.velocityY;
      double rotationFF = referenceState.angularVelocity;

      double xFeedback = xController.apply(pose.getX(), referenceState.x);
      double yFeedback = yController.apply(pose.getY(), referenceState.y);
      double rotationFeedback =
          rotationController.apply(pose.getRotation().getRadians(), referenceState.heading);

      return ChassisSpeeds.fromFieldRelativeSpeeds(
          xFF + xFeedback, yFF + yFeedback, rotationFF + rotationFeedback, pose.getRotation());
    };
  }

  /**
   * Creates a control function for following a ChoreoTrajectoryState.
   *
   * @param xController A PIDController for field-relative X translation (input: X error in meters,
   *     output: m/s).
   * @param yController A PIDController for field-relative Y translation (input: Y error in meters,
   *     output: m/s).
   * @param rotationController A PIDController for robot rotation (input: heading error in radians,
   *     output: rad/s). This controller will have its continuous input range set to -pi..pi by
   *     ChoreoLib.
   * @return A ChoreoControlFunction to track ChoreoTrajectoryStates. This function returns
   *     robot-relative ChassisSpeeds.
   */
  public static ChoreoControlFunction choreoSwerveController(
      PIDController xController, PIDController yController, PIDController rotationController) {
    rotationController.enableContinuousInput(-Math.PI, Math.PI);

    return choreoSwerveController(
        xController::calculate, yController::calculate, rotationController::calculate);
  }
}
