package com.choreo.lib;

import com.choreo.lib.trajectory.ChoreoTrajectory;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj2.command.Subsystem;
import java.util.List;
import java.util.Optional;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.function.Supplier;

/**
 * A factory used to create autonomous routines.
 *
 * <p>Here is an example of how to use this class to create an auto routine:
 *
 * <pre><code>
 * public ChoreoAutoLoop shootThenMove(ChoreoAutoFactory factory) {
 *   // create a new auto loop to return
 *   var loop = factory.newLoop();
 *
 *   // create a trajectory that moves the robot 2 meters
 *   ChoreoAutoTrajectory traj = factory.traj("move2meters", loop);
 *
 *   // will automatically run the shoot command when the auto loop is first polled
 *   loop.enabled().onTrue(shooter.shoot());
 *
 *   // gets a trigger from the shooter to if the shooter has a note,
 *   // and will run the trajectory command when the shooter does not have a note
 *   loop.enabled().and(shooter.hasNote()).onFalse(traj.cmd());
 *
 *   return loop;
 * }
 * </code></pre>
 */
public class ChoreoAutoFactory {
  private final Supplier<Pose2d> poseSupplier;
  private final ChoreoControlFunction controller;
  private final Consumer<ChassisSpeeds> outputChassisSpeeds;
  private final BooleanSupplier mirrorTrajectory;
  private final Optional<Consumer<ChoreoTrajectory>> trajLogger;
  private final Subsystem driveSubsystem;

  ChoreoAutoFactory(
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      Optional<Consumer<ChoreoTrajectory>> trajLogger,
      Subsystem driveSubsystem) {
    this.poseSupplier = poseSupplier;
    this.controller = controller;
    this.outputChassisSpeeds = outputChassisSpeeds;
    this.mirrorTrajectory = mirrorTrajectory;
    this.driveSubsystem = driveSubsystem;
    this.trajLogger = trajLogger;
  }

  /**
   * Creates a new auto loop to be used to make an auto routine.
   *
   * @return A new auto loop.
   */
  public ChoreoAutoLoop newLoop() {
    return new ChoreoAutoLoop();
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajName The name of the trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public ChoreoAutoTrajectory traj(String trajName, ChoreoAutoLoop loop) {
    return new ChoreoAutoTrajectory(
        trajName,
        Choreo.getTrajectory(trajName)
            .orElseGet(
                () -> {
                  DriverStation.reportError("Could not load trajectory: " + trajName, false);
                  return new ChoreoTrajectory();
                }),
        poseSupplier,
        controller,
        outputChassisSpeeds,
        mirrorTrajectory,
        trajLogger,
        driveSubsystem,
        loop.getLoop());
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajectory The trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public ChoreoAutoTrajectory traj(ChoreoTrajectory trajectory, ChoreoAutoLoop loop) {
    return new ChoreoAutoTrajectory(
        trajectory.name(),
        trajectory,
        poseSupplier,
        controller,
        outputChassisSpeeds,
        mirrorTrajectory,
        trajLogger,
        driveSubsystem,
        loop.getLoop());
  }

  /**
   * Creates a new auto trajectory based on a trajectory group.
   *
   * @param trajName The name of the trajectory group to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public ChoreoAutoTrajectory trajGroup(String trajName, ChoreoAutoLoop loop) {
    return new ChoreoAutoTrajectory(
        trajName,
        Choreo.getTrajectoryGroup(trajName)
            .orElseGet(
                () -> {
                  DriverStation.reportError("Could not load trajectory group: " + trajName, false);
                  return List.of();
                }),
        poseSupplier,
        controller,
        outputChassisSpeeds,
        mirrorTrajectory,
        trajLogger,
        driveSubsystem,
        loop.getLoop());
  }

  /**
   * Creates a new auto trajectory based on a trajectory group.
   *
   * @param trajectories The list of trajectories to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public ChoreoAutoTrajectory trajGroup(List<ChoreoTrajectory> trajectories, ChoreoAutoLoop loop) {
    return new ChoreoAutoTrajectory(
        "", // TODO
        trajectories,
        poseSupplier,
        controller,
        outputChassisSpeeds,
        mirrorTrajectory,
        trajLogger,
        driveSubsystem,
        loop.getLoop());
  }
}
