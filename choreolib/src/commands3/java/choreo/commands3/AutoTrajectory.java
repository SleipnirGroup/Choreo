// Copyright (c) Choreo contributors

package choreo.commands3;

import static choreo.util.ChoreoAlert.allianceNotReady;

import choreo.Choreo.TrajectoryLogger;
import choreo.commands3.AutoFactory.AllianceContext;
import choreo.commands3.AutoFactory.AutoBindings;
import choreo.trajectory.DifferentialSample;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import choreo.util.ChoreoAlert;
import choreo.util.ChoreoAlert.MultiAlert;
import choreo.util.ChoreoAllianceFlipUtil;
import java.util.Optional;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.function.Supplier;
import org.wpilib.command3.Command;
import org.wpilib.command3.Coroutine;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Trigger;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.system.Timer;
import org.wpilib.util.Alert.Level;

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
      ChoreoAlert.multiAlert(causes -> "Trigger time cannot be negative for " + causes, Level.HIGH);
  private static final MultiAlert triggerTimeAboveMax =
      ChoreoAlert.multiAlert(
          causes -> "Trigger time cannot be greater than total trajectory time for " + causes + ".",
          Level.HIGH);
  private static final MultiAlert eventNotFound =
      ChoreoAlert.multiAlert(causes -> "Event Markers " + causes + " not found.", Level.HIGH);
  private static final MultiAlert noSamples =
      ChoreoAlert.multiAlert(causes -> "Trajectories " + causes + " have no samples.", Level.HIGH);
  private static final MultiAlert noInitialPose =
      ChoreoAlert.multiAlert(
          causes -> "Unable to get initial pose for trajectories " + causes + ".", Level.HIGH);

  final String name;
  final Trajectory<? extends TrajectorySample<?>> trajectory;
  final TrajectoryLogger<? extends TrajectorySample<?>> trajectoryLogger;
  final Supplier<Pose2d> poseSupplier;
  final Consumer<Pose2d> resetOdometry;
  final Consumer<? extends TrajectorySample<?>> controller;
  final AllianceContext allianceCtx;
  final Mechanism driveMechanism;
  final AutoRoutine routine;
  final AutoBindings bindings;

  private final Timer activeTimer = new Timer();
  private final Timer inactiveTimer = new Timer();

  /** If this trajectory is currently running. */
  private boolean isActive = false;

  /** If the trajectory ran to completion. */
  private boolean isCompleted = false;

  /** Set by the command body when it finishes without being cancelled. */
  private boolean finishedNaturally = false;

  /** Whether to suppress warnings for this trajectory. */
  private boolean warnUser = true;

  /**
   * Constructs an AutoTrajectory.
   *
   * @param name The trajectory name.
   * @param trajectory The trajectory samples.
   * @param poseSupplier The pose supplier.
   * @param resetOdometry The odometry reset function.
   * @param controller The controller function.
   * @param allianceCtx The alliance context.
   * @param trajectoryLogger Optional trajectory logger.
   * @param driveMechanism Drive mechanism.
   * @param routine The routine this trajectory belongs to.
   * @param bindings {@link AutoFactory}
   */
  <SampleType extends TrajectorySample<SampleType>> AutoTrajectory(
      String name,
      Trajectory<SampleType> trajectory,
      Supplier<Pose2d> poseSupplier,
      Consumer<Pose2d> resetOdometry,
      Consumer<SampleType> controller,
      AllianceContext allianceCtx,
      TrajectoryLogger<SampleType> trajectoryLogger,
      Mechanism driveMechanism,
      AutoRoutine routine,
      AutoBindings bindings) {
    this.name = name;
    this.trajectory = trajectory;
    this.poseSupplier = poseSupplier;
    this.resetOdometry = resetOdometry;
    this.controller = controller;
    this.allianceCtx = allianceCtx;
    this.driveMechanism = driveMechanism;
    this.routine = routine;
    this.trajectoryLogger = trajectoryLogger;
    this.bindings = bindings;
    routine.register(this);

    bindings.getBindings().forEach((key, value) -> active().and(atTime(key)).onTrue(value));
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
  }

  private void cmdInitialize() {
    activeTimer.reset();
    activeTimer.start();
    inactiveTimer.stop();
    inactiveTimer.reset();
    isActive = true;
    isCompleted = false;
    finishedNaturally = false;
    routine.trajectoryStarted();
    logTrajectory(true);
  }

  @SuppressWarnings("unchecked")
  private void cmdExecute() {
    if (!allianceCtx.allianceKnownOrIgnored()) {
      allianceNotReady.set(true);
      return;
    }
    var sampleOpt = trajectory.sampleAt(activeTimer.get(), allianceCtx.doFlip());
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

  @SuppressWarnings("unchecked")
  private void cmdEnd(boolean interrupted) {
    activeTimer.stop();
    activeTimer.reset();
    inactiveTimer.reset();
    inactiveTimer.start();
    isActive = false;
    isCompleted = !interrupted;
    routine.trajectoryEnded();

    if (!interrupted && allianceCtx.allianceKnownOrIgnored()) {
      var sampleOpt = trajectory.getFinalSample(allianceCtx.doFlip());
      if (sampleOpt.isPresent()) {
        var sample = sampleOpt.get();
        if (sample instanceof SwerveSample swerveSample) {
          var swerveController = (Consumer<SwerveSample>) this.controller;
          swerveController.accept(swerveSample);
        } else if (sample instanceof DifferentialSample differentialSample) {
          var differentialController = (Consumer<DifferentialSample>) this.controller;
          differentialController.accept(differentialSample);
        }
      }
    }

    logTrajectory(false);
  }

  private boolean cmdIsFinished() {
    return activeTimer.get() > trajectory.getTotalTime()
        || !routine.active().getAsBoolean()
        || !allianceCtx.allianceKnownOrIgnored();
  }

  /** The body of the trajectory following command. */
  private void cmdBody(Coroutine coroutine) {
    cmdInitialize();
    while (!cmdIsFinished()) {
      cmdExecute();
      coroutine.yield();
    }
    finishedNaturally = true;
  }

  /** Clears the run state of this trajectory. Called when its routine starts. */
  void reset() {
    activeTimer.stop();
    activeTimer.reset();
    inactiveTimer.stop();
    inactiveTimer.reset();
    isActive = false;
    isCompleted = false;
    finishedNaturally = false;
  }

  /** Suppresses warnings for this trajectory. */
  void suppressWarnings() {
    warnUser = false;
  }

  /**
   * Creates a command that follows the trajectory using the factory's control function, without
   * requiring the drive mechanism. Used to warm up Choreo, including while disabled.
   *
   * @return The command that will follow the trajectory
   */
  Command warmupCmd() {
    return Command.noRequirements(this::cmdBody)
        .whenExited(() -> cmdEnd(!finishedNaturally))
        .named("Trajectory_" + name);
  }

  /**
   * Creates a command that requires the drive mechanism and follows the trajectory using the
   * factory's control function.
   *
   * @return The command that will follow the trajectory
   */
  public Command cmd() {
    if (trajectory.samples().isEmpty() && warnUser) {
      return Command.requiring(driveMechanism)
          .executing(coroutine -> noSamples.addCause(name))
          .named("Trajectory_" + name);
    }
    return Command.requiring(driveMechanism)
        .executing(this::cmdBody)
        .whenExited(() -> cmdEnd(!finishedNaturally))
        .named("Trajectory_" + name);
  }

  /**
   * Creates a command that schedules the trajectory command separately instead of running it
   * itself.
   *
   * <p>Use this when a sequence needs to start a trajectory that requires a mechanism the sequence
   * also requires.
   *
   * @return The command that will schedule the trajectory following command.
   */
  public Command spawnCmd() {
    return Command.noRequirements(coroutine -> coroutine.scheduler().schedule(cmd()))
        .named("Trajectory_" + name + "_Spawner");
  }

  /**
   * Creates a command that resets the robot's odometry to the start of this trajectory.
   *
   * @return A command that resets the robot's odometry.
   */
  public Command resetOdometry() {
    return Command.requiring(driveMechanism)
        .executing(
            coroutine ->
                getInitialPose()
                    .ifPresentOrElse(
                        resetOdometry,
                        () -> {
                          if (warnUser) {
                            noInitialPose.addCause(name);
                          }
                        }))
        .named("Trajectory_ResetOdometry_" + name);
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
   * Returns this auto trajectory, mirrored to the other alliance.
   *
   * @param <SampleType> The type of the trajectory samples. Due to Java limitations, you have to
   *     specify the sample type again here even if it was already specified when creating the
   *     AutoTrajectory.
   * @return this auto trajectory, mirrored to the other alliance.
   */
  @SuppressWarnings("unchecked")
  public <SampleType extends TrajectorySample<SampleType>> AutoTrajectory mirrorX() {
    return new AutoTrajectory(
        name,
        (Trajectory<SampleType>) trajectory.mirrorX(),
        poseSupplier,
        resetOdometry,
        (Consumer<SampleType>) controller,
        allianceCtx,
        (TrajectoryLogger<SampleType>) trajectoryLogger,
        driveMechanism,
        routine,
        bindings);
  }

  /**
   * Returns this auto trajectory, mirrored left-to-right from the driver's perspective.
   *
   * @param <SampleType> The type of the trajectory samples. Due to Java limitations, you have to
   *     specify the sample type again here even if it was already specified when creating the
   *     AutoTrajectory.
   * @return this auto trajectory, mirrored left-to-right from the driver's perspective.
   */
  @SuppressWarnings("unchecked")
  public <SampleType extends TrajectorySample<SampleType>> AutoTrajectory mirrorY() {
    return new AutoTrajectory(
        name,
        (Trajectory<SampleType>) trajectory.mirrorY(),
        poseSupplier,
        resetOdometry,
        (Consumer<SampleType>) controller,
        allianceCtx,
        (TrajectoryLogger<SampleType>) trajectoryLogger,
        driveMechanism,
        routine,
        bindings);
  }

  /**
   * Returns this auto trajectory, rotated 180 degrees around the field center.
   *
   * @param <SampleType> The type of the trajectory samples. Due to Java limitations, you have to
   *     specify the sample type again here even if it was already specified when creating the
   *     AutoTrajectory.
   * @return this auto trajectory, rotated 180 degrees around the field center.
   */
  @SuppressWarnings("unchecked")
  public <SampleType extends TrajectorySample<SampleType>> AutoTrajectory rotateAround() {
    return new AutoTrajectory(
        name,
        (Trajectory<SampleType>) trajectory.rotateAround(),
        poseSupplier,
        resetOdometry,
        (Consumer<SampleType>) controller,
        allianceCtx,
        (TrajectoryLogger<SampleType>) trajectoryLogger,
        driveMechanism,
        routine,
        bindings);
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
    if (!allianceCtx.allianceKnownOrIgnored()) {
      allianceNotReady.set(true);
      return Optional.empty();
    }
    return trajectory.getInitialPose(allianceCtx.doFlip());
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
    if (!allianceCtx.allianceKnownOrIgnored()) {
      allianceNotReady.set(true);
      return Optional.empty();
    }
    return trajectory.getFinalPose(allianceCtx.doFlip());
  }

  /**
   * Returns a trigger that is true while the trajectory is scheduled.
   *
   * @return A trigger that is true while the trajectory is scheduled.
   */
  public Trigger active() {
    return routine.active().and(() -> this.isActive);
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

  private Trigger enterExitTrigger(Trigger enter, Trigger exit) {
    return new Trigger(
        new BooleanSupplier() {
          private boolean output = false;

          @Override
          public boolean getAsBoolean() {
            if (enter.getAsBoolean()) {
              output = true;
            }
            if (exit.getAsBoolean()) {
              output = false;
            }
            return output;
          }
        });
  }

  /**
   * Returns a trigger that is true after the trajectory completes.
   *
   * @return a trigger that is true after the trajectory completes
   */
  public Trigger done() {
    return doneDelayed(0);
  }

  /**
   * Returns a trigger that becomes true after the trajectory completes and the given delay.
   *
   * @param seconds the delay after completion, in seconds
   * @return a trigger that is true after the trajectory completes and the given delay
   */
  public Trigger doneDelayed(double seconds) {
    return timeTrigger(seconds, inactiveTimer).and(() -> isCompleted);
  }

  /**
   * Returns a trigger that remains true for the given duration after completion.
   *
   * @param seconds the duration for which the trigger remains true, in seconds
   * @return a trigger that remains true for the given duration after completion
   */
  public Trigger doneFor(double seconds) {
    return enterExitTrigger(doneDelayed(0), doneDelayed(seconds));
  }

  /**
   * Returns a trigger that remains true after completion until the routine becomes idle.
   *
   * @return a trigger that remains true after completion until the routine becomes idle
   */
  public Trigger recentlyDone() {
    return enterExitTrigger(doneDelayed(0), routine.idle().negate());
  }

  /**
   * A shorthand for `.done().onTrue(otherTrajectory.cmd())`
   *
   * @param otherTrajectory The other trajectory to run when this one is done.
   */
  public void chain(AutoTrajectory otherTrajectory) {
    done().onTrue(otherTrajectory.cmd());
  }

  /**
   * Creates a trigger that is true for exactly one scheduler cycle: the first cycle in which the
   * running {@code timer} has reached {@code targetTime}.
   */
  private Trigger timeTrigger(double targetTime, Timer timer) {
    return new Trigger(() -> timer.isRunning() && timer.get() >= targetTime).risingEdge();
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
      if (warnUser) {
        triggerTimeNegative.addCause(name);
      }
      return new Trigger(() -> false);
    }

    // The timer should never exceed the total trajectory time so report this as a warning
    if (timeSinceStart > trajectory.getTotalTime()) {
      if (warnUser) {
        triggerTimeAboveMax.addCause(name);
      }
      return new Trigger(() -> false);
    }

    return timeTrigger(timeSinceStart, activeTimer);
  }

  /**
   * Returns a trigger that will go true for 1 cycle when the desired before the end of the
   * trajectory time.
   *
   * @param timeBeforeEnd The time before the end of the trajectory.
   * @return A trigger that is true when timeBeforeEnd has elapsed.
   */
  public Trigger atTimeBeforeEnd(double timeBeforeEnd) {
    return atTime(trajectory.getTotalTime() - timeBeforeEnd);
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
    Trigger trig = new Trigger(() -> false);

    for (var event : trajectory.getEvents(eventName)) {
      trig = trig.or(atTime(event.timestamp));
      foundEvent = true;
    }

    // The user probably expects an event to exist if they're trying to do something at that event,
    // report the missing event.
    if (!foundEvent && warnUser) {
      eventNotFound.addCause(name);
    }

    return trig;
  }

  private boolean withinTolerance(Rotation2d lhs, Rotation2d rhs, double toleranceRadians) {
    if (Math.abs(toleranceRadians) > Math.PI) {
      return true;
    }
    double dot = lhs.getCos() * rhs.getCos() + lhs.getSin() * rhs.getSin();
    // cos(θ) >= cos(tolerance) means |θ| <= tolerance, for tolerance in [-pi, pi], as pre-checked
    // above.
    return dot > Math.cos(toleranceRadians);
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
    Pose2d flippedPose = ChoreoAllianceFlipUtil.flip(pose);
    return new Trigger(
            () -> {
              if (allianceCtx.allianceKnownOrIgnored()) {
                final Pose2d currentPose = poseSupplier.get();
                final Pose2d target = allianceCtx.doFlip() ? flippedPose : pose;
                boolean transValid =
                    currentPose.getTranslation().getDistance(target.getTranslation())
                        < toleranceMeters;
                boolean rotValid =
                    withinTolerance(
                        currentPose.getRotation(), target.getRotation(), toleranceRadians);
                return transValid && rotValid;
              } else {
                allianceNotReady.set(true);
                return false;
              }
            })
        .and(active());
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
    Trigger trig = new Trigger(() -> false);

    for (var event : trajectory.getEvents(eventName)) {
      Optional<Pose2d> poseOpt =
          trajectory
              // don't mirror here because the poses are mirrored themselves
              // this also lets atPose be called before the alliance is ready
              .sampleAt(event.timestamp, false)
              .map(TrajectorySample::getPose);
      if (poseOpt.isPresent()) {
        trig = trig.or(atPose(poseOpt.get(), toleranceMeters, toleranceRadians));
        foundEvent = true;
      }
    }

    // The user probably expects an event to exist if they're trying to do something at that event,
    // report the missing event.
    if (!foundEvent && warnUser) {
      eventNotFound.addCause(name);
    }

    return trig;
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
    Translation2d flippedTranslation = ChoreoAllianceFlipUtil.flip(translation);
    return new Trigger(
            () -> {
              if (allianceCtx.allianceKnownOrIgnored()) {
                final Translation2d currentTrans = poseSupplier.get().getTranslation();
                if (allianceCtx.doFlip()) {
                  return currentTrans.getDistance(flippedTranslation) < toleranceMeters;
                } else {
                  return currentTrans.getDistance(translation) < toleranceMeters;
                }
              } else {
                allianceNotReady.set(true);
                return false;
              }
            })
        .and(active());
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
    Trigger trig = new Trigger(() -> false);

    for (var event : trajectory.getEvents(eventName)) {
      Optional<Translation2d> translationOpt =
          trajectory
              // don't mirror here because the translations are mirrored themselves
              // this also lets atTranslation be called before the alliance is ready
              .sampleAt(event.timestamp, false)
              .map(TrajectorySample::getPose)
              .map(Pose2d::getTranslation);
      if (translationOpt.isPresent()) {
        trig = trig.or(atTranslation(translationOpt.get(), toleranceMeters));
        foundEvent = true;
      }
    }

    // The user probably expects an event to exist if they're trying to do something at that event,
    // report the missing event.
    if (!foundEvent && warnUser) {
      eventNotFound.addCause(name);
    }

    return trig;
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
    double[] times =
        trajectory.getEvents(eventName).stream()
            .filter(e -> e.timestamp >= 0 && e.timestamp <= trajectory.getTotalTime())
            .mapToDouble(e -> e.timestamp)
            .toArray();

    if (times.length == 0 && warnUser) {
      eventNotFound.addCause("collectEvents(" + eventName + ")");
    }

    return times;
  }

  /**
   * Returns an array of all the poses of the events with the given name.
   *
   * <p>The returned poses are always unflipped. If you use them in a trigger like `atPose` or
   * `atTranslation`, the library will automatically flip them if necessary. If you intend using
   * them in a different context, you can use {@link ChoreoAllianceFlipUtil#flip} to flip them.
   *
   * @param eventName The name of the event.
   * @return An array of all the poses of the events with the given name.
   * @see <a href="https://choreo.autos/usage/editing-paths/#event-markers">Event Markers in the
   *     GUI</a>
   */
  public Pose2d[] collectEventPoses(String eventName) {
    double[] times = collectEventTimes(eventName);
    Pose2d[] poses = new Pose2d[times.length];
    for (int i = 0; i < times.length; i++) {
      Pose2d pose =
          trajectory
              .sampleAt(times[i], false)
              .map(TrajectorySample::getPose)
              .get(); // the event times are guaranteed to be valid
      poses[i] = pose;
    }
    return poses;
  }

  @Override
  public boolean equals(Object obj) {
    return obj instanceof AutoTrajectory traj && name.equals(traj.name);
  }

  @Override
  public int hashCode() {
    return name.hashCode();
  }
}
