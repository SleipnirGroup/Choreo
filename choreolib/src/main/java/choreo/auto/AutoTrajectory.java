// Copyright (c) Choreo contributors

package choreo.auto;

import static edu.wpi.first.wpilibj.Alert.AlertType.kError;

import choreo.Choreo;
import choreo.Choreo.MultiAlert;
import choreo.Choreo.TrajectoryLogger;
import choreo.auto.AutoFactory.AutoBindings;
import choreo.trajectory.DifferentialSample;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import choreo.util.AllianceFlipUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.FunctionalCommand;
import edu.wpi.first.wpilibj2.command.Subsystem;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import java.util.ArrayList;
import java.util.Optional;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
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

  private static final MultiAlert triggerTimeNegative =
      Choreo.multiAlert(causes -> "Trigger time cannot be negative for " + causes, kError);
  private static final MultiAlert triggerTimeAboveMax =
      Choreo.multiAlert(
          causes -> "Trigger time cannot be greater than total trajectory time for " + causes + ".",
          kError);
  private static final MultiAlert eventNotFound =
      Choreo.multiAlert(causes -> "Event Markers " + causes + " not found.", kError);
  private static final MultiAlert noSamples =
      Choreo.multiAlert(causes -> "Trajectories " + causes + " have no samples.", kError);
  private static final MultiAlert noInitialPose =
      Choreo.multiAlert(
          causes -> "Unable to get initial pose for trajectories " + causes + ".", kError);

  private static final double DEFAULT_TOLERANCE_METERS = Units.inchesToMeters(3);
  private static final double DEFAULT_TOLERANCE_RADIANS = Units.degreesToRadians(3);
  private final String name;
  private final Trajectory<? extends TrajectorySample<?>> trajectory;
  private final TrajectoryLogger<? extends TrajectorySample<?>> trajectoryLogger;
  private final Supplier<Pose2d> poseSupplier;
  private final Consumer<Pose2d> resetOdometry;
  private final Consumer<? extends TrajectorySample<?>> controller;
  private final BooleanSupplier useAllianceFlipping;
  private final Supplier<Optional<Alliance>> alliance;
  private final Timer timer = new Timer();
  private final Subsystem driveSubsystem;
  private final AutoRoutine routine;

  /**
   * A way to create slightly less triggers for many actions. Not static as to not leak triggers
   * made here into another static EventLoop.
   */
  private final Trigger offTrigger;

  /** If this trajectory us currently running */
  private boolean isActive = false;

  /** If the trajectory ran to completion */
  private boolean isCompleted = false;

  /**
   * Constructs an AutoTrajectory.
   *
   * @param name The trajectory name.
   * @param trajectory The trajectory samples.
   * @param poseSupplier The pose supplier.
   * @param controller The controller function.
   * @param useAllianceFlipping Getter that determines whether to mirror trajectory based off
   *     alliance.
   * @param trajectoryLogger Optional trajectory logger.
   * @param driveSubsystem Drive subsystem.
   * @param routine Event loop.
   * @param bindings {@link AutoFactory}
   */
  <SampleType extends TrajectorySample<SampleType>> AutoTrajectory(
      String name,
      Trajectory<SampleType> trajectory,
      Supplier<Pose2d> poseSupplier,
      Consumer<Pose2d> resetOdometry,
      Consumer<SampleType> controller,
      BooleanSupplier useAllianceFlipping,
      Supplier<Optional<Alliance>> alliance,
      TrajectoryLogger<SampleType> trajectoryLogger,
      Subsystem driveSubsystem,
      AutoRoutine routine,
      AutoBindings bindings) {
    this.name = name;
    this.trajectory = trajectory;
    this.poseSupplier = poseSupplier;
    this.resetOdometry = resetOdometry;
    this.controller = controller;
    this.useAllianceFlipping = useAllianceFlipping;
    this.alliance = alliance;
    this.driveSubsystem = driveSubsystem;
    this.routine = routine;
    this.offTrigger = new Trigger(routine.loop(), () -> false);
    this.trajectoryLogger = trajectoryLogger;

    bindings.getBindings().forEach((key, value) -> active().and(atTime(key)).onTrue(value));
  }

  /**
   * Returns true if alliance flipping is enabled and the alliance optional is present. Also returns
   * true if alliance flipping is disabled.
   */
  private boolean allowSampling() {
    return routine.allianceKnownOrIgnored.getAsBoolean();
  }

  /**
   * Returns true if alliance flipping is enabled and the alliance is red.
   *
   * @return
   */
  private boolean doFlip() {
    return useAllianceFlipping.getAsBoolean()
        && alliance.get().map(a -> a == Alliance.Red).orElse(false);
  }

  @SuppressWarnings("unchecked")
  private void logTrajectory(boolean starting) {
    var sampleOpt = trajectory.getInitialSample(false);
    if (sampleOpt.isEmpty()) {
      return;
    }
    var sample = sampleOpt.get();
    if (sample instanceof SwerveSample) {
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
    isCompleted = false;
    logTrajectory(true);
  }

  @SuppressWarnings("unchecked")
  private void cmdExecute() {
    var sampleOpt = trajectory.sampleAt(timer.get(), doFlip());
    if (sampleOpt.isEmpty()) {
      return;
    }
    var sample = sampleOpt.get();
    if (sample instanceof SwerveSample swerveSample) {
      var swerveController = (Consumer<SwerveSample>) this.controller;
      swerveController.accept(swerveSample);
    } else if (sample instanceof DifferentialSample differentialSample) {
      var differentialController = (Consumer<DifferentialSample>) this.controller;
      differentialController.accept(differentialSample);
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
    return timer.get() > trajectory.getTotalTime() || !routine.isActive;
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
      return driveSubsystem.runOnce(() -> noSamples.addCause(name)).withName("Trajectory_" + name);
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
   * Creates a command that resets the robot's odometry to the start of this trajectory.
   *
   * @return A command that resets the robot's odometry.
   */
  Command resetOdometry() {
    return Commands.either(
            Commands.runOnce(() -> resetOdometry.accept(getInitialPose().get()), driveSubsystem),
            Commands.runOnce(
                    () -> {
                      noInitialPose.addCause(name);
                      routine.kill();
                    })
                .andThen(Commands.idle()),
            () -> getInitialPose().isPresent())
        .withName("Trajectory_ResetOdometry_" + name);
  }

  /**
   * Will get the underlying {@link Trajectory} object.
   *
   * <p><b>WARNING:</b> This method is not type safe and should be used with caution. The sample
   * type of the trajectory should be known before calling this method.
   *
   * @param <SampleType> The type of the trajectory samples.
   * @return The underlying {@link Trajectory} object.
   */
  @SuppressWarnings("unchecked")
  public <SampleType extends TrajectorySample<SampleType>>
      Trajectory<SampleType> getRawTrajectory() {
    return (Trajectory<SampleType>) trajectory;
  }

  /**
   * Will get the starting pose of the trajectory.
   *
   * <p>This position is flipped if alliance flipping is enabled and the alliance supplier returns
   * Red.
   *
   * <p>This method returns an empty Optional if the trajectory is empty. This method returns an
   * empty Optional if alliance flipping is enabled and the alliance supplier returns an empty
   * Optional.
   *
   * @return The starting pose
   */
  public Optional<Pose2d> getInitialPose() {
    if (!allowSampling()) {
      return Optional.empty();
    }
    return trajectory.getInitialPose(doFlip());
  }

  /**
   * Will get the ending pose of the trajectory.
   *
   * <p>This position is flipped if alliance flipping is enabled and the alliance supplier returns
   * Red.
   *
   * <p>This method returns an empty Optional if the trajectory is empty. This method returns an
   * empty Optional if alliance flipping is enabled and the alliance supplier returns an empty
   * Optional.
   *
   * @return The starting pose
   */
  public Optional<Pose2d> getFinalPose() {
    if (!allowSampling()) {
      return Optional.empty();
    }
    return trajectory.getFinalPose(doFlip());
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
   * Returns a trigger that rises to true when the trajectory ends and falls after one pulse.
   *
   * <p>This is different from inactive() in a few ways.
   *
   * <ul>
   *   <li>This will never be true if the trajectory is interrupted
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
   * @return A trigger that is true when the trajectory is finished.
   */
  public Trigger done(int cyclesToDelay) {
    BooleanSupplier checker =
        new BooleanSupplier() {
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
    return inactive().and(new Trigger(routine.loop(), checker));
  }

  /**
   * Returns a trigger that rises to true when the trajectory ends and falls after one pulse.
   *
   * <p>This is different from inactive() in a few ways.
   *
   * <ul>
   *   <li>This will never be true if the trajectory is interrupted
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
   * @return A trigger that is true when the trajectory is finished.
   */
  public Trigger done() {
    return done(0);
  }

  private Supplier<Optional<Pose2d>> optionalFlipped(Optional<Pose2d> pose) {
    return AllianceFlipUtil.optionalFlippedPose2d(pose, alliance, useAllianceFlipping);
  }

  /**
   * Returns a trigger that will go true for 1 cycle when the desired time has elapsed
   *
   * @param timeSinceStart The time since the command started in seconds.
   * @return A trigger that is true when timeSinceStart has elapsed.
   */
  public Trigger atTime(double timeSinceStart) {
    // The timer should never be negative so report this as a warning
    if (timeSinceStart < 0) {
      triggerTimeNegative.addCause(name);
      return offTrigger;
    }

    // The timer should never exceed the total trajectory time so report this as a warning
    if (timeSinceStart > trajectory.getTotalTime()) {
      triggerTimeAboveMax.addCause(name);
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
   * @see <a href="https://choreo.autos/usage/editing-paths/#event-markers">Event Markers in the
   *     GUI</a>
   */
  public Trigger atTime(String eventName) {
    boolean foundEvent = false;
    Trigger trig = offTrigger;

    for (var event : trajectory.getEvents(eventName)) {
      // This could create a lot of objects, could be done a more efficient way
      // with having it all be 1 trigger that just has a list of times and checks each one each
      // cycle
      // or something like that. If choreo starts proposing memory issues we can look into this.
      trig = trig.or(atTime(event.timestamp));
      foundEvent = true;
    }

    // The user probably expects an event to exist if they're trying to do something at that event,
    // report the missing event.
    if (!foundEvent) {
      eventNotFound.addCause(name);
    }

    return trig;
  }

  private Trigger atPose(
      Supplier<Optional<Pose2d>> pose, double toleranceMeters, double toleranceRadians) {
    return new Trigger(
            routine.loop(),
            () -> {
              Optional<Pose2d> checkedPoseOpt = pose.get();
              return checkedPoseOpt
                  .map(
                      (checkedPose) -> {
                        Translation2d currentTrans = poseSupplier.get().getTranslation();
                        Rotation2d currentRot = poseSupplier.get().getRotation();
                        return currentTrans.getDistance(checkedPose.getTranslation())
                                < toleranceMeters
                            && Math.abs(currentRot.minus(checkedPose.getRotation()).getRadians())
                                < toleranceRadians;
                      })
                  .orElse(false);
            })
        .and(active());
  }

  private Trigger atPose(Optional<Pose2d> pose, double toleranceMeters, double toleranceRadians) {
    return atPose(
        AllianceFlipUtil.optionalFlippedPose2d(pose, alliance, useAllianceFlipping),
        toleranceMeters,
        toleranceRadians);
  }

  /**
   * Returns a trigger that is true when the robot is within toleranceMeters of the given pose.
   *
   * <p>The pose is flipped if alliance flipping is enabled and the alliance supplier returns Red.
   *
   * <p>While alliance flipping is enabled and the alliance supplier returns empty, the trigger will
   * return false.
   *
   * @param pose The pose to check against, unflipped.
   * @param toleranceMeters The tolerance in meters.
   * @param toleranceRadians The heading tolerance in radians.
   * @return A trigger that is true when the robot is within toleranceMeters of the given pose.
   */
  public Trigger atPose(Pose2d pose, double toleranceMeters, double toleranceRadians) {
    return atPose(Optional.of(pose), toleranceMeters, toleranceRadians);
  }

  /**
   * Returns a trigger that is true when the robot is within toleranceMeters and toleranceRadians of
   * the given event's pose.
   *
   * <p>A warning will be printed to the DriverStation if the event is not found and the trigger
   * will always be false.
   *
   * @param eventName The name of the event.
   * @param toleranceMeters The tolerance in meters.
   * @param toleranceRadians The heading tolerance in radians.
   * @return A trigger that is true when the robot is within toleranceMeters of the given events
   *     pose.
   * @see <a href="https://choreo.autos/usage/editing-paths/#event-markers">Event Markers in the
   *     GUI</a>
   */
  public Trigger atPose(String eventName, double toleranceMeters, double toleranceRadians) {
    boolean foundEvent = false;
    Trigger trig = offTrigger;

    for (var event : trajectory.getEvents(eventName)) {
      // This could create a lot of objects, could be done a more efficient way
      // with having it all be 1 trigger that just has a list of possess and checks each one each
      // cycle or something like that.
      // If choreo starts showing memory issues we can look into this.
      Optional<Pose2d> poseOpt =
          trajectory
              // don't mirror here because the poses are mirrored themselves
              // this also lets atPose be called before the alliance is ready
              .sampleAt(event.timestamp, false)
              .map(TrajectorySample::getPose);
      if (poseOpt
          .isPresent()) { // atPose accepts empty optionals but it would just be a false trigger
        trig = trig.or(atPose(poseOpt, toleranceMeters, toleranceRadians));
        foundEvent = true;
      }
    }

    // The user probably expects an event to exist if they're trying to do something at that event,
    // report the missing event.
    if (!foundEvent) {
      eventNotFound.addCause(name);
    }

    return trig;
  }

  /**
   * Returns a trigger that is true when the robot is within 3 inches and 3 degrees of the given
   * event's pose.
   *
   * <p>A warning will be printed to the DriverStation if the event is not found and the trigger
   * will always be false.
   *
   * @param eventName The name of the event.
   * @return A trigger that is true when the robot is within 3 inches and 3 degrees of the given
   *     event's pose.
   * @see <a href="https://choreo.autos/usage/editing-paths/#event-markers">Event Markers in the
   *     GUI</a>
   */
  public Trigger atPose(String eventName) {
    return atPose(eventName, DEFAULT_TOLERANCE_METERS, DEFAULT_TOLERANCE_RADIANS);
  }

  private Trigger atTranslation(
      Supplier<Optional<Translation2d>> translation, double toleranceMeters) {
    return new Trigger(
            routine.loop(),
            () -> {
              Optional<Translation2d> checkedTranslationOpt = translation.get();
              return checkedTranslationOpt
                  .map(
                      (checkedTranslation) -> {
                        Translation2d currentTrans = poseSupplier.get().getTranslation();
                        return currentTrans.getDistance(checkedTranslation) < toleranceMeters;
                      })
                  .orElse(false);
            })
        .and(active());
  }

  private Trigger atTranslation(Optional<Translation2d> translation, double toleranceMeters) {
    return atTranslation(
        AllianceFlipUtil.optionalFlippedTranslation2d(translation, alliance, useAllianceFlipping),
        toleranceMeters);
  }

  /**
   * Returns a trigger that is true when the robot is within toleranceMeters of the given
   * translation.
   *
   * <p>The translation is flipped if alliance flipping is enabled and the alliance supplier returns
   * Red.
   *
   * <p>While alliance flipping is enabled and the alliance supplier returns empty, the trigger will
   * return false.
   *
   * @param translation The translation to check against, unflipped.
   * @param toleranceMeters The tolerance in meters.
   * @return A trigger that is true when the robot is within toleranceMeters of the given
   *     translation.
   */
  public Trigger atTranslation(Translation2d translation, double toleranceMeters) {
    return atTranslation(Optional.of(translation), toleranceMeters);
  }

  /**
   * Returns a trigger that is true when the robot is within toleranceMeters and toleranceRadians of
   * the given event's translation.
   *
   * <p>A warning will be printed to the DriverStation if the event is not found and the trigger
   * will always be false.
   *
   * @param eventName The name of the event.
   * @param toleranceMeters The tolerance in meters.
   * @return A trigger that is true when the robot is within toleranceMeters of the given events
   *     translation.
   * @see <a href="https://choreo.autos/usage/editing-paths/#event-markers">Event Markers in the
   *     GUI</a>
   */
  public Trigger atTranslation(String eventName, double toleranceMeters) {
    boolean foundEvent = false;
    Trigger trig = offTrigger;

    for (var event : trajectory.getEvents(eventName)) {
      // This could create a lot of objects, could be done a more efficient way
      // with having it all be 1 trigger that just has a list of possess and checks each one each
      // cycle or something like that.
      // If choreo starts showing memory issues we can look into this.
      Optional<Translation2d> translationOpt =
          trajectory
              // don't mirror here because the translations are mirrored themselves
              // this also lets atTranslation be called before the alliance is ready
              .sampleAt(event.timestamp, false)
              .map(TrajectorySample::getPose)
              .map(Pose2d::getTranslation);
      if (translationOpt
          .isPresent()) { // atTranslation accepts empty optionals but it would just be a false
        // trigger
        trig = trig.or(atTranslation(translationOpt, toleranceMeters));
        foundEvent = true;
      }
    }

    // The user probably expects an event to exist if they're trying to do something at that event,
    // report the missing event.
    if (!foundEvent) {
      eventNotFound.addCause(name);
    }

    return trig;
  }

  /**
   * Returns a trigger that is true when the robot is within 3 inches and 3 degrees of the given
   * event's translation.
   *
   * <p>A warning will be printed to the DriverStation if the event is not found and the trigger
   * will always be false.
   *
   * @param eventName The name of the event.
   * @return A trigger that is true when the robot is within 3 inches and 3 degrees of the given
   *     event's translation.
   * @see <a href="https://choreo.autos/usage/editing-paths/#event-markers">Event Markers in the
   *     GUI</a>
   */
  public Trigger atTranslation(String eventName) {
    return atTranslation(eventName, DEFAULT_TOLERANCE_METERS);
  }

  /**
   * Returns an array of all the timestamps of the events with the given name.
   *
   * @param eventName The name of the event.
   * @return An array of all the timestamps of the events with the given name.
   * @see <a href="https://choreo.autos/usage/editing-paths/#event-markers">Event Markers in the
   *     GUI</a>
   */
  public double[] collectEventTimes(String eventName) {
    return trajectory.getEvents(eventName).stream().mapToDouble(e -> e.timestamp).toArray();
  }

  /**
   * Returns an array of all the poses of the events with the given name.
   *
   * @param eventName The name of the event.
   * @return An array of all the poses of the events with the given name.
   * @see <a href="https://choreo.autos/usage/editing-paths/#event-markers">Event Markers in the
   *     GUI</a>
   */
  public ArrayList<Supplier<Optional<Pose2d>>> collectEventPoses(String eventName) {
    var times = collectEventTimes(eventName);
    ArrayList<Supplier<Optional<Pose2d>>> poses = new ArrayList<>();
    for (int i = 0; i < times.length; i++) {
      trajectory
          .sampleAt(times[i], false)
          .map(TrajectorySample::getPose)
          .ifPresent(pose -> poses.add(optionalFlipped(Optional.of(pose))));
    }
    return poses;
  }

  @Override
  public boolean equals(Object obj) {
    return obj instanceof AutoTrajectory traj && name.equals(traj.name);
  }
}
