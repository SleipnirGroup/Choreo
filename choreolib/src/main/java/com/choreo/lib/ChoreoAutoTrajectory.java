package com.choreo.lib;

import com.choreo.lib.trajectory.ChoreoTrajectory;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.FunctionalCommand;
import edu.wpi.first.wpilibj2.command.Subsystem;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.function.Supplier;

/**
 * A class that represents a trajectory that can be used in an autonomous routine and have triggers
 * based off of it.
 */
public class ChoreoAutoTrajectory {
  // did inches to meters like this to keep final
  private static final double DEFAULT_TOLERANCE_METERS = Units.inchesToMeters(3);

  private final String trajName;
  private final ChoreoTrajectory trajectory;
  private final Supplier<Pose2d> poseSupplier;
  private final ChoreoControlFunction controller;
  private final Consumer<ChassisSpeeds> outputChassisSpeeds;
  private final BooleanSupplier mirrorTrajectory;
  private final Timer timer = new Timer();
  private final Subsystem driveSubsystem;
  private final EventLoop loop;

  private boolean isDone = false;
  private boolean isActive = false;

  ChoreoAutoTrajectory(
      String trajName,
      ChoreoTrajectory trajectory,
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      Subsystem driveSubsystem,
      EventLoop loop) {
    this.trajName = trajName;
    this.trajectory = trajectory;
    this.poseSupplier = poseSupplier;
    this.controller = controller;
    this.outputChassisSpeeds = outputChassisSpeeds;
    this.mirrorTrajectory = mirrorTrajectory;
    this.driveSubsystem = driveSubsystem;
    this.loop = loop;
  }

  private void cmdInitialize() {
    timer.reset();
    isDone = false;
    isActive = true;
  }

  private void cmdExecute() {
    outputChassisSpeeds.accept(
        controller.apply(
            poseSupplier.get(), trajectory.sample(timer.get(), mirrorTrajectory.getAsBoolean())));
  }

  private void cmdEnd(boolean interrupted) {
    timer.stop();
    if (interrupted) {
      outputChassisSpeeds.accept(new ChassisSpeeds());
    } else {
      outputChassisSpeeds.accept(trajectory.getFinalState().getChassisSpeeds());
    }
    isDone = true;
    isActive = false;
  }

  private boolean cmdIsFinished() {
    return timer.hasElapsed(trajectory.getTotalTime());
  }

  public Command cmd() {
    return new FunctionalCommand(
        this::cmdInitialize, this::cmdExecute, this::cmdEnd, this::cmdIsFinished, driveSubsystem);
  }

  /**
   * Returns a trigger that is true while the command is scheduled.
   *
   * @return A trigger that is true while the command is scheduled.
   */
  public Trigger active() {
    return new Trigger(loop, () -> this.isActive);
  }

  /**
   * Returns a trigger that is true while the command is not scheduled.
   *
   * <p>The same as calling <code>active().negate()</code>.
   *
   * @return A trigger that is true while the command is not scheduled.
   */
  public Trigger inactive() {
    return active().negate();
  }

  /**
   * Returns a trigger that is true when the command is finished.
   *
   * @return A trigger that is true when the command is finished.
   */
  public Trigger done() {
    return new Trigger(loop, () -> this.isDone);
  }

  /**
   * Returns a trigger that is true when timeSinceStart has elapsed.
   *
   * @param timeSinceStart The time since the command started in seconds.
   * @return A trigger that is true when timeSinceStart has elapsed.
   */
  public Trigger atTime(double timeSinceStart) {
    if (timeSinceStart < 0) {
      DriverStation.reportWarning("Trigger time cannot be negative for " + trajName, true);
      return new Trigger(loop, () -> false);
    }
    if (timeSinceStart > trajectory.getTotalTime()) {
      DriverStation.reportWarning(
          "Trigger time cannot be greater than total trajectory time for " + trajName, true);
      return new Trigger(loop, () -> false);
    }
    return new Trigger(loop, () -> timer.get() >= timeSinceStart);
  }

  /**
   * Returns a trigger that is true when the event with the given name has been reached based on
   * time.
   *
   * <p>A warning will be printed to the DriverStation if the event is not found and the trigger
   * will always be false.
   *
   * @param eventName The name of the event.
   * @return A trigger that is true when the event with the given name has been reached based on
   *     time.
   */
  public Trigger atTime(String eventName) {
    var optEvent = trajectory.getEvent(eventName);
    if (optEvent.isPresent()) {
      return atTime(optEvent.get().timestamp);
    } else {
      DriverStation.reportWarning("Event \"" + eventName + "\" not found for " + trajName, true);
      return new Trigger(loop, () -> false);
    }
  }

  // private because this is a terrible way to schedule stuff
  private Trigger atPose(Pose2d pose, double toleranceMeters) {
    return new Trigger(
        loop,
        () -> {
          Pose2d currentPose = poseSupplier.get();
          return currentPose.getTranslation().getDistance(pose.getTranslation()) < toleranceMeters;
        });
  }

  /**
   * Returns a trigger that is true when the robot is within toleranceMeters of the given events
   * pose.
   *
   * <p>A warning will be printed to the DriverStation if the event is not found and the trigger
   * will always be false.
   *
   * @param eventName The name of the event.
   * @param toleranceMeters The tolerance in meters.
   * @return A trigger that is true when the robot is within toleranceMeters of the given events
   *     pose.
   */
  public Trigger atPose(String eventName, double toleranceMeters) {
    var optEvent = trajectory.getEvent(eventName);
    if (optEvent.isPresent()) {
      Pose2d pose =
          trajectory.sample(optEvent.get().timestamp, mirrorTrajectory.getAsBoolean()).getPose();
      return atPose(pose, toleranceMeters);
    } else {
      DriverStation.reportWarning("Event \"" + eventName + "\" not found for " + trajName, true);
      return new Trigger(loop, () -> false);
    }
  }

  /**
   * Returns a trigger that is true when the robot is within 3 inches of the given events pose.
   *
   * <p>A warning will be printed to the DriverStation if the event is not found and the trigger
   * will always be false.
   *
   * @param eventName The name of the event.
   * @return A trigger that is true when the robot is within 3 inches of the given events pose.
   */
  public Trigger atPose(String eventName) {
    return atPose(eventName, DEFAULT_TOLERANCE_METERS);
  }

  /**
   * Returns a trigger that is true when the event with the given name has been reached based on
   * time and the robot is within toleranceMeters of the given events pose.
   *
   * <p>A warning will be printed to the DriverStation if the event is not found and the trigger
   * will always be false.
   *
   * @param eventName The name of the event.
   * @param toleranceMeters The tolerance in meters.
   * @return A trigger that is true when the event with the given name has been reached based on
   *     time and the robot is within toleranceMeters of the given events pose.
   */
  public Trigger atTimeAndPlace(String eventName, double toleranceMeters) {
    return atTime(eventName).and(atPose(eventName, toleranceMeters));
  }

  /**
   * Returns a trigger that is true when the event with the given name has been reached based on
   * time and the robot is within 3 inches of the given events pose.
   *
   * <p>A warning will be printed to the DriverStation if the event is not found and the trigger
   * will always be false.
   *
   * @param eventName The name of the event.
   * @return A trigger that is true when the event with the given name has been reached based on
   *     time and the robot is within 3 inches of the given events pose.
   */
  public Trigger atTimeAndPlace(String eventName) {
    return atTimeAndPlace(eventName, DEFAULT_TOLERANCE_METERS);
  }

  /**
   * Clones this trajectory with a new name. This leaves the original trajectory unchanged. All
   * triggers that are based off this trajecotry will not be triggered off the clone.
   *
   * @param newName The new name for the cloned trajectory.
   * @return A new {@link ChoreoAutoTrajectory} with the same properties as this trajectory but with
   *     a new name.
   */
  public ChoreoAutoTrajectory clone(String newName) {
    return new ChoreoAutoTrajectory(
        newName,
        trajectory,
        poseSupplier,
        controller,
        outputChassisSpeeds,
        mirrorTrajectory,
        driveSubsystem,
        loop);
  }
}
