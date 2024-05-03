package com.choreo.lib;

import com.choreo.lib.trajectory.ChoreoTrajectory;
import com.choreo.lib.trajectory.ChoreoTrajectoryState;
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
import java.util.List;
import java.util.Optional;
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

  private final String name;
  private final List<ChoreoTrajectory> trajectories;
  private final Optional<Consumer<ChoreoTrajectory>> trajLogger;
  private final Supplier<Pose2d> poseSupplier;
  private final ChoreoControlFunction controller;
  private final Consumer<ChassisSpeeds> outputChassisSpeeds;
  private final BooleanSupplier mirrorTrajectory;
  private final Timer timer = new Timer();
  private final Subsystem driveSubsystem;
  private final EventLoop loop;

  /** A way to create slightly less triggers for alot of actions */
  private final Trigger offTrigger;

  // TODO: fix some shared state footguns if you make multiple commands off this,
  // hypothetically if you do `.onFalse()` on done when you schedule the next command
  // the trigger will run and could be unexpected behavior

  /** If the trajecoty has finished */
  private boolean isDone = false;

  /** If this trajectory us currently running */
  private boolean isActive = false;

  /** The index of the current trajectory being run */
  private int trajectoryIndex = 0;

  /** The time that the previous trajectories took up */
  private double timeOffset = 0.0;

  ChoreoAutoTrajectory(
      String name,
      ChoreoTrajectory trajectory,
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      Optional<Consumer<ChoreoTrajectory>> trajLogger,
      Subsystem driveSubsystem,
      EventLoop loop) {
    this.name = name;
    this.trajectories = List.of(trajectory);
    this.trajLogger = trajLogger;
    this.poseSupplier = poseSupplier;
    this.controller = controller;
    this.outputChassisSpeeds = outputChassisSpeeds;
    this.mirrorTrajectory = mirrorTrajectory;
    this.driveSubsystem = driveSubsystem;
    this.loop = loop;
    this.offTrigger = new Trigger(loop, () -> false);
  }

  ChoreoAutoTrajectory(
      String name,
      List<ChoreoTrajectory> trajectories,
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      Optional<Consumer<ChoreoTrajectory>> trajLogger,
      Subsystem driveSubsystem,
      EventLoop loop) {
    this.name = "Group " + name;
    this.trajectories = trajectories;
    this.trajLogger = trajLogger;
    this.poseSupplier = poseSupplier;
    this.controller = controller;
    this.outputChassisSpeeds = outputChassisSpeeds;
    this.mirrorTrajectory = mirrorTrajectory;
    this.driveSubsystem = driveSubsystem;
    this.loop = loop;
    this.offTrigger = new Trigger(loop, () -> false);
  }

  /**
   * Returns the index of the last trajectory in the list
   *
   * @return Returns the index of the last trajectory in the list
   */
  private int lastTrajIndex() {
    return trajectories.size() - 1;
  }

  private double timeIntoCurrentTraj() {
    return timer.get() - timeOffset;
  }

  private ChoreoTrajectory currentTrajectory() {
    return trajectories.get(trajectoryIndex);
  }

  private double totalTime() {
    double totalTime = 0.0;
    for (var traj : trajectories) {
      totalTime += traj.getTotalTime();
    }
    return totalTime;
  }

  private void cmdInitialize() {
    timer.restart();
    trajLogger.ifPresent(logger -> logger.accept(trajectories.get(0)));
    isDone = false;
    isActive = true;
    trajectoryIndex = 0;
    timeOffset = 0.0;
  }

  private void cmdExecute() {
    if (timeIntoCurrentTraj() > currentTrajectory().getTotalTime()
        && trajectoryIndex < lastTrajIndex()) {
      timeOffset += currentTrajectory().getTotalTime();
      trajectoryIndex = Math.min(trajectoryIndex + 1, lastTrajIndex());
    }
    outputChassisSpeeds.accept(
        controller.apply(
            poseSupplier.get(),
            currentTrajectory().sample(timeIntoCurrentTraj(), mirrorTrajectory.getAsBoolean())));
  }

  private void cmdEnd(boolean interrupted) {
    timer.stop();
    if (interrupted) {
      outputChassisSpeeds.accept(new ChassisSpeeds());
    } else {
      var lastTraj = trajectories.get(lastTrajIndex());
      outputChassisSpeeds.accept(lastTraj.getFinalState().getChassisSpeeds());
    }
    isDone = true;
    isActive = false;
  }

  private boolean cmdIsFinished() {
    return trajectoryIndex == lastTrajIndex()
        && timeIntoCurrentTraj() > currentTrajectory().getTotalTime();
  }

  /**
   * Creates a command that allocates the drive subsystem and follows the trajectory using the
   * factories control function
   *
   * @return The command that will follow the trajectory
   */
  public Command cmd() {
    return new FunctionalCommand(
        this::cmdInitialize, this::cmdExecute, this::cmdEnd, this::cmdIsFinished, driveSubsystem);
  }

  /**
   * Will get the starting pose of the trajectory.
   *
   * <p>This position is mirrored based on the {@code mirrorTrajectory} boolean supplier in the
   * factory used to make this trajectory
   *
   * @return The starting pose
   */
  public Pose2d getStartingPose() {
    if (mirrorTrajectory.getAsBoolean()) {
      return trajectories.get(0).getFlippedInitialPose();
    } else {
      return trajectories.get(0).getInitialPose();
    }
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
   * Returns a trigger that will go true for 1 cycle when the desired time has elapsed
   *
   * @param timeSinceStart The time since the command started in seconds.
   * @return A trigger that is true when timeSinceStart has elapsed.
   */
  public Trigger atTime(double timeSinceStart) {

    // The timer shhould never be negative so report this as a warning
    if (timeSinceStart < 0) {
      DriverStation.reportWarning("Trigger time cannot be negative for " + name, true);
      return offTrigger;
    }

    // The timer should never exceed the total trajectory time so report this as a warning
    if (timeSinceStart > totalTime()) {
      DriverStation.reportWarning(
          "Trigger time cannot be greater than total trajectory time for " + name, true);
      return offTrigger;
    }

    // Make the trigger only be high for 1 cycle whne the time has elapsed,
    // this is needed for better support of multi-time triggers for multi events
    return new Trigger(
        loop,
        new BooleanSupplier() {
          double lastTimestamp = timer.get();

          public boolean getAsBoolean() {
            double nowTimestamp = timer.get();
            return lastTimestamp < nowTimestamp && nowTimestamp >= timeSinceStart;
          }
        });
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
    double pastTrajTotalTime = 0.0;
    boolean foundEvent = false;
    Trigger trig = offTrigger;

    // couldve maybe used stream, flatmap and foreach but this is still readable
    for (var traj : trajectories) {
      for (var event : traj.getEvents(eventName)) {
        // This could create alot of objects, could be done a more efficient way
        // with having it all be 1 trigger that just has a list of times and checks each one each
        // cycle
        // or something like that. If choreo starts proposing memory issues we can look into this.
        trig = trig.or(atTime(pastTrajTotalTime + event.timestamp));
        foundEvent = true;
      }

      pastTrajTotalTime += traj.getTotalTime();
    }

    // The user probably expects an event to exist if theyre trying to do something at that event,
    // report the missing event.
    if (!foundEvent) {
      DriverStation.reportWarning("Event \"" + eventName + "\" not found for " + name, true);
    }

    return trig;
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
    double pastTrajTotalTime = 0.0;
    boolean foundEvent = false;
    Trigger trig = offTrigger;

    // couldve maybe used stream, flatmap and foreach but this is still readable
    for (var traj : trajectories) {
      for (var event : traj.getEvents(eventName)) {
        // This could create alot of objects, could be done a more efficient way
        // with having it all be 1 trigger that just has a list of posess and checks each one each
        // cycle
        // or something like that. If choreo starts proposing memory issues we can look into this.
        ChoreoTrajectoryState state =
            traj.sample(pastTrajTotalTime + event.timestamp, mirrorTrajectory.getAsBoolean());
        trig = trig.or(atPose(state.getPose(), toleranceMeters));
        foundEvent = true;
      }

      pastTrajTotalTime += traj.getTotalTime();
    }

    // The user probably expects an event to exist if theyre trying to do something at that event,
    // report the missing event.
    if (!foundEvent) {
      DriverStation.reportWarning("Event \"" + eventName + "\" not found for " + name, true);
    }

    return trig;
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
   * Creates a trigger at the start of a sub trajectory. This is best used with trajectory groups,
   * with non group trajectories only 0 is a valid argument
   *
   * @param index The index of the command in the group
   * @return A trigger that is true while the subtrajectory is running
   */
  public Trigger whileSubTrajectoryActive(int index) {
    if (index > lastTrajIndex() || index < 0) {
      DriverStation.reportWarning("Subtrajectory index was out of bounds for " + name, true);
      return offTrigger;
    } else {
      return new Trigger(loop, () -> trajectoryIndex == index && isActive);
    }
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
        trajectories,
        poseSupplier,
        controller,
        outputChassisSpeeds,
        mirrorTrajectory,
        trajLogger,
        driveSubsystem,
        loop);
  }
}
