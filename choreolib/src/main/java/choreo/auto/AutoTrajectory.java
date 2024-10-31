// Copyright (c) Choreo contributors

package choreo.auto;

import choreo.Choreo;
import choreo.Choreo.TrajectoryLogger;
import choreo.auto.AutoFactory.AutoBindings;
import choreo.trajectory.DifferentialSample;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import choreo.util.AllianceFlipUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.FunctionalCommand;
import edu.wpi.first.wpilibj2.command.Subsystem;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import java.util.Optional;
import java.util.function.BiConsumer;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;

/**
 * A class that represents a trajectory that can be used in an autonomous routine and have triggers
 * based off of it.
 */
public class AutoTrajectory {
  // For any devs looking through this class wondering
  // about all the type casting and `?` for generics it's intentional.
  // My goal was to make the sample type minimally leak into user code
  // so you don't have to retype the sample type everywhere in your auto
  // code. This also makes the places with generics exposed to users few
  // and far between. This helps with more novice users

  private static final double DEFAULT_TOLERANCE_METERS = Units.inchesToMeters(3);

  private final String name;
  private final Trajectory<? extends TrajectorySample<?>> trajectory;
  private final TrajectoryLogger<? extends TrajectorySample<?>> trajectoryLogger;
  private final Supplier<Pose2d> poseSupplier;
  private final BiConsumer<Pose2d, ? extends TrajectorySample<?>> controller;
  private final BooleanSupplier mirrorTrajectory;
  private final Timer timer = new Timer();
  private final Subsystem driveSubsystem;
  private final AutoRoutine routine;

  /**
   * A way to create slightly less triggers for alot of actions. Not static as to not leak triggers
   * made here into another static EventLoop.
   */
  private final Trigger offTrigger;

  /** If this trajectory us currently running */
  private boolean isActive = false;
  /** If the trajectory ran to completion */
  private boolean isCompleted = false;

  /** The time that the previous trajectories took up */
  private double timeOffset = 0.0;

  /**
   * Constructs an AutoTrajectory.
   *
   * @param name The trajectory name.
   * @param trajectory The trajectory samples.
   * @param poseSupplier The pose supplier.
   * @param controller The controller function.
   * @param mirrorTrajectory Getter that determines whether to mirror trajectory.
   * @param trajectoryLogger Optional trajectory logger.
   * @param driveSubsystem Drive subsystem.
   * @param routine Event loop.
   * @param bindings {@link Choreo#createAutoFactory}
   */
  <SampleType extends TrajectorySample<SampleType>> AutoTrajectory(
      String name,
      Trajectory<SampleType> trajectory,
      Supplier<Pose2d> poseSupplier,
      BiConsumer<Pose2d, SampleType> controller,
      BooleanSupplier mirrorTrajectory,
      Optional<TrajectoryLogger<SampleType>> trajectoryLogger,
      Subsystem driveSubsystem,
      AutoRoutine routine,
      AutoBindings bindings) {
    this.name = name;
    this.trajectory = trajectory;
    this.poseSupplier = poseSupplier;
    this.controller = controller;
    this.mirrorTrajectory = mirrorTrajectory;
    this.driveSubsystem = driveSubsystem;
    this.routine = routine;
    this.offTrigger = new Trigger(routine.loop(), () -> false);
    this.trajectoryLogger =
        trajectoryLogger.isPresent()
            ? trajectoryLogger.get()
            : new TrajectoryLogger<SampleType>() {
              public void accept(Trajectory<SampleType> t, Boolean u) {}
            };

    bindings.getBindings().forEach((key, value) -> active().and(atTime(key)).onTrue(value));
  }

  /**
   * Returns the time since the start of the current trajectory
   *
   * @return The time since the start of the current trajectory
   */
  private double timeIntoTrajectory() {
    return timer.get() + timeOffset;
  }

  /**
   * Returns the total time of all the trajectories
   *
   * @return The total time of all the trajectories
   */
  private double totalTime() {
    return trajectory.getTotalTime();
  }

  @SuppressWarnings("unchecked")
  private void logTrajectory(boolean starting) {
    TrajectorySample<?> sample = trajectory.getInitialSample();
    if (sample == null) {
      return;
    } else if (sample instanceof SwerveSample) {
      TrajectoryLogger<SwerveSample> swerveLogger =
          (TrajectoryLogger<SwerveSample>) trajectoryLogger;
      Trajectory<SwerveSample> swerveTrajectory = (Trajectory<SwerveSample>) trajectory;
      swerveLogger.accept(swerveTrajectory, starting);
    } else if (sample instanceof DifferentialSample) {
      TrajectoryLogger<DifferentialSample> differentialLogger =
          (TrajectoryLogger<DifferentialSample>) trajectoryLogger;
      Trajectory<DifferentialSample> differentialTrajectory =
          (Trajectory<DifferentialSample>) trajectory;
      differentialLogger.accept(differentialTrajectory, starting);
    }
    ;
  }

  private void cmdInitialize() {
    timer.restart();
    isActive = true;
    timeOffset = 0.0;
    isCompleted = false;
    logTrajectory(true);
  }

  @SuppressWarnings("unchecked")
  private void cmdExecute() {
    var sample = trajectory.sampleAt(timeIntoTrajectory(), mirrorTrajectory.getAsBoolean());
    if (sample instanceof SwerveSample swerveSample) {
      var swerveController = (BiConsumer<Pose2d, SwerveSample>) this.controller;
      swerveController.accept(poseSupplier.get(), swerveSample);
    } else if (sample instanceof DifferentialSample differentialSample) {
      var differentialController = (BiConsumer<Pose2d, DifferentialSample>) this.controller;
      differentialController.accept(poseSupplier.get(), differentialSample);
    }
  }

  private void cmdEnd(boolean interrupted) {
    timer.stop();
    isActive = false;
    isCompleted = !interrupted;
    cmdExecute(); // will force the controller to be fed the final sample
    logTrajectory(false);
  }

  private boolean cmdIsFinished() {
    return timeIntoTrajectory() > totalTime() || !routine.isActive;
  }

  /**
   * Creates a command that allocates the drive subsystem and follows the trajectory using the
   * factories control function
   *
   * @return The command that will follow the trajectory
   */
  public Command cmd() {
    // if the trajectory is empty, return a command that will print an error
    if (trajectory.samples().isEmpty()) {
      return driveSubsystem
          .runOnce(
              () -> {
                DriverStation.reportError("Trajectory " + name + " has no samples", false);
              })
          .withName("Trajectory_" + name);
    }
    return new FunctionalCommand(
            this::cmdInitialize,
            this::cmdExecute,
            this::cmdEnd,
            this::cmdIsFinished,
            driveSubsystem)
        .withName("Trajectory_" + name);
  }

  /**
   * Will get the starting pose of the trajectory.
   *
   * <p>This position is mirrored based on the {@code mirrorTrajectory} boolean supplier in the
   * factory used to make this trajectory
   *
   * @return The starting pose
   */
  public Optional<Pose2d> getInitialPose() {
    if (trajectory.samples().isEmpty()) {
      return Optional.empty();
    }
    return Optional.ofNullable(trajectory.getInitialPose(mirrorTrajectory.getAsBoolean()));
  }

  /**
   * Will get the ending pose of the trajectory.
   *
   * <p>This position is mirrored based on the {@code mirrorTrajectory} boolean supplier in the
   * factory used to make this trajectory
   *
   * @return The starting pose
   */
  public Optional<Pose2d> getFinalPose() {
    if (trajectory.samples().isEmpty()) {
      return Optional.empty();
    }
    return Optional.ofNullable(trajectory.getFinalPose(mirrorTrajectory.getAsBoolean()));
  }

  /**
   * Returns a trigger that is true while the trajectory is scheduled.
   *
   * @return A trigger that is true while the trajectory is scheduled.
   */
  public Trigger active() {
    return new Trigger(routine.loop(), () -> this.isActive && routine.isActive);
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
   * Returns a trigger that rises to true when the trajectory ends and falls when another trajectory
   * is run.
   *
   * <p>This is different from inactive() in a few ways.
   *
   * <ul>
   *   <li>This will never be true if the trajectory is interupted
   *   <li>This will never be true before the trajectory is run
   *   <li>This will fall the next cycle after the trajectory ends
   * </ul>
   *
   * <p>Why does the trigger need to fall?
   *
   * <pre><code>
   * //Lets say we had this code segment
   * Trigger hasGamepiece = ...;
   * Trigger noGamepiece = hasGamepiece.negate();
   *
   * AutoTrajectory rushMidTraj = ...;
   * AutoTrajectory goShootGamepiece = ...;
   * AutoTrajectory pickupAnotherGamepiece = ...;
   *
   * routine.enabled().onTrue(rushMidTraj.cmd());
   *
   * rushMidTraj.done(10).and(noGamepiece).onTrue(pickupAnotherGamepiece.cmd());
   * rushMidTraj.done(10).and(hasGamepiece).onTrue(goShootGamepiece.cmd());
   *
   * // If done never falls when a new trajectory is scheduled
   * // then these triggers leak into the next trajectory, causing the next note pickup
   * // to trigger goShootGamepiece.cmd() even if we no longer care about these checks
   * </code></pre>
   *
   * @param cyclesToDelay The number of cycles to delay the trigger from rising to true.
   * @return A trigger that is true when the trajectoy is finished.
   */
  public Trigger done(int cyclesToDelay) {
    BooleanSupplier checker = new BooleanSupplier() {
      /** The last used value for trajectory completeness */
      boolean lastCompleteness = false;
      /** The cycle to be true for */
      int cycleTarget = -1;

      @Override
      public boolean getAsBoolean() {
        if (!isCompleted) {
          // update last seen value
          lastCompleteness = false;
          return false;
        }
        if (!lastCompleteness && isCompleted) {
          // if just flipped to completed update last seen value
          // and store the cycleTarget based of the current cycle
          lastCompleteness = true;
          cycleTarget = routine.pollCount() + cyclesToDelay;
        }
        // finally if check the cycle matches the target
        return routine.pollCount() == cycleTarget;
      }
    };
    return inactive()
        .and(new Trigger(routine.loop(), checker));
  }

  /**
   * Returns a trigger that rises to true when the trajectory ends and falls when another trajectory
   * is run.
   *
   * <p>This is different from inactive() in a few ways.
   *
   * <ul>
   *   <li>This will never be true if the trajectory is interupted
   *   <li>This will never be true before the trajectory is run
   *   <li>This will fall the next cycle after the trajectory ends
   * </ul>
   *
   * <p>Why does the trigger need to fall?
   *
   * <pre><code>
   * //Lets say we had this code segment
   * Trigger hasGamepiece = ...;
   * Trigger noGamepiece = hasGamepiece.negate();
   *
   * AutoTrajectory rushMidTraj = ...;
   * AutoTrajectory goShootGamepiece = ...;
   * AutoTrajectory pickupAnotherGamepiece = ...;
   *
   * routine.enabled().onTrue(rushMidTraj.cmd());
   *
   * rushMidTraj.done().and(noGamepiece).onTrue(pickupAnotherGamepiece.cmd());
   * rushMidTraj.done().and(hasGamepiece).onTrue(goShootGamepiece.cmd());
   *
   * // If done never falls when a new trajectory is scheduled
   * // then these triggers leak into the next trajectory, causing the next note pickup
   * // to trigger goShootGamepiece.cmd() even if we no longer care about these checks
   * </code></pre>
   *
   * @return A trigger that is true when the trajectoy is finished.
   */
  public Trigger done() {
    return done(0);
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

    // Make the trigger only be high for 1 cycle when the time has elapsed,
    // this is needed for better support of multi-time triggers for multi events
    return new Trigger(
        routine.loop(),
        new BooleanSupplier() {
          double lastTimestamp = timer.get();

          public boolean getAsBoolean() {
            double nowTimestamp = timer.get();
            try {
              return lastTimestamp < nowTimestamp && nowTimestamp >= timeSinceStart;
            } finally {
              lastTimestamp = nowTimestamp;
            }
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
    boolean foundEvent = false;
    Trigger trig = offTrigger;

    for (var event : trajectory.getEvents(eventName)) {
      // This could create alot of objects, could be done a more efficient way
      // with having it all be 1 trigger that just has a list of times and checks each one each
      // cycle
      // or something like that. If choreo starts proposing memory issues we can look into this.
      trig = trig.or(atTime(event.timestamp));
      foundEvent = true;
    }

    // The user probably expects an event to exist if they're trying to do something at that event,
    // report the missing event.
    if (!foundEvent) {
      DriverStation.reportWarning("Event \"" + eventName + "\" not found for " + name, true);
    }

    return trig;
  }

  /**
   * Returns a trigger that is true when the robot is within toleranceMeters of the given pose.
   *
   * <p>This position is mirrored based on the {@code mirrorTrajectory} boolean supplier in the
   * factory used to make this trajectory.
   *
   * @param pose The pose to check against
   * @param toleranceMeters The tolerance in meters.
   * @return A trigger that is true when the robot is within toleranceMeters of the given pose.
   */
  public Trigger atPose(Pose2d pose, double toleranceMeters) {
    Translation2d checkedTrans =
        mirrorTrajectory.getAsBoolean()
            ? AllianceFlipUtil.flip(pose.getTranslation())
            : pose.getTranslation();
    return new Trigger(
        routine.loop(),
        () -> {
          Translation2d currentTrans = poseSupplier.get().getTranslation();
          return currentTrans.getDistance(checkedTrans) < toleranceMeters;
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
    boolean foundEvent = false;
    Trigger trig = offTrigger;

    for (var event : trajectory.getEvents(eventName)) {
      // This could create alot of objects, could be done a more efficient way
      // with having it all be 1 trigger that just has a list of possess and checks each one each
      // cycle or something like that.
      // If choreo starts proposing memory issues we can look into this.
      Pose2d pose = trajectory.sampleAt(event.timestamp, mirrorTrajectory.getAsBoolean()).getPose();
      trig = trig.or(atPose(pose, toleranceMeters));
      foundEvent = true;
    }

    // The user probably expects an event to exist if they're trying to do something at that event,
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
   * Returns an array of all the timestamps of the events with the given name.
   *
   * @param eventName The name of the event.
   * @return An array of all the timestamps of the events with the given name.
   */
  public double[] collectEventTimes(String eventName) {
    return trajectory.getEvents(eventName).stream().mapToDouble(e -> e.timestamp).toArray();
  }

  /**
   * Returns an array of all the poses of the events with the given name.
   *
   * @param eventName The name of the event.
   * @return An array of all the poses of the events with the given name.
   */
  public Pose2d[] collectEventPoses(String eventName) {
    var times = collectEventTimes(eventName);
    var poses = new Pose2d[times.length];
    for (int i = 0; i < times.length; i++) {
      poses[i] = trajectory.sampleAt(times[i], mirrorTrajectory.getAsBoolean()).getPose();
    }
    return poses;
  }

  @Override
  public boolean equals(Object obj) {
    return obj instanceof AutoTrajectory traj && name.equals(traj.name);
  }
}
