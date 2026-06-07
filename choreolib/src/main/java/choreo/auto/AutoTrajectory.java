// Copyright (c) Choreo contributors

package choreo.auto;

import static choreo.util.ChoreoAlert.allianceNotReady;

import choreo.Choreo.TrajectoryLogger;
import choreo.auto.AutoFactory.AllianceContext;
import choreo.auto.AutoFactory.AutoBindings;
import choreo.trajectory.DifferentialSample;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import choreo.util.ChoreoAlert;
import choreo.util.ChoreoAlert.MultiAlert;
import choreo.util.ChoreoAllianceFlipUtil;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Supplier;
import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Trigger;
import org.wpilib.driverstation.Alert.Level;
import org.wpilib.driverstation.internal.DriverStationBackend;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.system.Timer;

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
  final AutoBindings bindings;

  private final Timer activeTimer = new Timer();
  private final Timer inactiveTimer = new Timer();

  /** If this trajectory us currently running */
  private boolean isActive = false;

  /** Whether to suppress warnings for this trajectory. */
  private boolean warnUser = true;

  /**
   * Constructs an AutoTrajectory.
   *
   * @param name The trajectory name.
   * @param trajectory The trajectory samples.
   * @param poseSupplier The pose supplier.
   * @param controller The controller function.
   * @param allianceCtx The alliance context.
   * @param trajectoryLogger Optional trajectory logger.
   * @param driveMechanism Drive Mechanism.
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
      AutoBindings bindings) {
    this.name = name;
    this.trajectory = trajectory;
    this.poseSupplier = poseSupplier;
    this.resetOdometry = resetOdometry;
    this.controller = controller;
    this.allianceCtx = allianceCtx;
    this.driveMechanism = driveMechanism;
    this.trajectoryLogger = trajectoryLogger;
    this.bindings = bindings;

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
    ;
  }

  private void cmdInitialize() {
    activeTimer.start();
    inactiveTimer.stop();
    inactiveTimer.reset();
    isActive = true;
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
    inactiveTimer.start();
    isActive = false;

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
        || DriverStationBackend.isDisabled()
        || !allianceCtx.allianceKnownOrIgnored();
  }

  /** Suppresses warnings for this trajectory. */
  void suppressWarnings() {
    warnUser = false;
  }

  /**
   * Creates a command that allocates the drive Mechanism and follows the trajectory using the
   * factories control function
   *
   * @return The command that will follow the trajectory
   */
  public Command cmd() {
    return driveMechanism
        .run(
            coro -> {
              // if the trajectory is empty, return a command that will print an error
              if (trajectory.samples().isEmpty() && warnUser) {
                noSamples.addCause(name);
                return;
              }
              cmdInitialize();
              while (!cmdIsFinished()) {
                cmdExecute();
                coro.yield();
              }
              cmdEnd(false);
            })
        .whenCanceled(() -> cmdEnd(true))
        .named("Trajectory_" + name);
  }

  /**
   * Creates a command that resets the robot's odometry to the start of this trajectory.
   *
   * @return A command that resets the robot's odometry.
   */
  public Command resetOdometry() {
    return driveMechanism
        .run(
            coro -> {
              var initialPose = getInitialPose();
              if (initialPose.isPresent()) {
                resetOdometry.accept(initialPose.get());
              } else {
                if (warnUser) {
                  noInitialPose.addCause(name);
                }
                coro.park();
              }
            })
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
    return new Trigger(() -> this.isActive);
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

  private Trigger timeTrigger(double targetTime, Timer timer) {
    // Make the trigger only be high for 1 cycle when the time has elapsed
    return new Trigger(() -> timer.get() > targetTime).risingEdge();
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
      // This could create a lot of objects, could be done a more efficient way
      // with having it all be 1 trigger that just has a list of times and checks each one each
      // cycle
      // or something like that. If choreo starts proposing memory issues we can look into this.
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
                if (allianceCtx.doFlip()) {
                  boolean transValid =
                      currentPose.getTranslation().getDistance(flippedPose.getTranslation())
                          < toleranceMeters;
                  boolean rotValid =
                      withinTolerance(
                          currentPose.getRotation(), flippedPose.getRotation(), toleranceRadians);
                  return transValid && rotValid;
                } else {
                  boolean transValid =
                      currentPose.getTranslation().getDistance(pose.getTranslation())
                          < toleranceMeters;
                  boolean rotValid =
                      withinTolerance(
                          currentPose.getRotation(), pose.getRotation(), toleranceRadians);
                  return transValid && rotValid;
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
      // This could create a lot of objects, could be done a more efficient way
      // with having it all be 1 trigger that just has a list of poses and checks each one each
      // cycle or something like that.
      // If choreo starts showing memory issues we can look into this.
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
}
