// Copyright (c) Choreo contributors

package choreo.autos;

import choreo.Choreo.ControlFunction;
import choreo.Choreo.TrajectoryLogger;
import choreo.autos.AutoFactory.ChoreoAutoBindings;
import choreo.ext.CommandExt;
import choreo.ext.TriggerExt;
import choreo.trajectory.DifferentialSample;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import choreo.util.AllianceFlipUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.FunctionalCommand;
import edu.wpi.first.wpilibj2.command.Subsystem;
import edu.wpi.first.wpilibj2.command.button.Trigger;
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

  // did inches to meters like this to keep final
  private static final double DEFAULT_TOLERANCE_METERS = Units.inchesToMeters(3);
  private static final ChassisSpeeds DEFAULT_CHASSIS_SPEEDS = new ChassisSpeeds();

  private final String name;
  private final Trajectory<? extends TrajectorySample<?>> trajectory;
  private final TrajectoryLogger<? extends TrajectorySample<?>> trajLogger;
  private final Supplier<Pose2d> poseSupplier;
  private final ControlFunction<? extends TrajectorySample<?>> controller;
  private final Consumer<ChassisSpeeds> outputChassisSpeeds;
  private final BooleanSupplier mirrorTrajectory;
  private final Timer timer = new Timer();
  private final Subsystem driveSubsystem;
  private final EventLoop loop;

  /**
   * A way to create slightly less triggers for alot of actions. Not static as to not leak triggers
   * made here into another static EventLoop.
   */
  private final TriggerExt offTrigger;

  /** If this trajectory us currently running */
  private boolean isActive = false;

  /** The time that the previous trajectories took up */
  private double timeOffset = 0.0;

  <SampleType extends TrajectorySample<SampleType>> AutoTrajectory(
      String name,
      Trajectory<SampleType> trajectory,
      Supplier<Pose2d> poseSupplier,
      ControlFunction<SampleType> controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      Optional<TrajectoryLogger<SampleType>> trajLogger,
      Subsystem driveSubsystem,
      EventLoop loop,
      ChoreoAutoBindings bindings) {
    this.name = name;
    this.trajectory = trajectory;
    this.poseSupplier = poseSupplier;
    this.controller = controller;
    this.outputChassisSpeeds = outputChassisSpeeds;
    this.mirrorTrajectory = mirrorTrajectory;
    this.driveSubsystem = driveSubsystem;
    this.loop = loop;
    this.offTrigger = new TriggerExt(loop, () -> false);
    this.trajLogger =
        trajLogger.isPresent()
            ? trajLogger.get()
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
      TrajectoryLogger<SwerveSample> swerveLogger = (TrajectoryLogger<SwerveSample>) trajLogger;
      Trajectory<SwerveSample> swerveTrajectory = (Trajectory<SwerveSample>) trajectory;
      swerveLogger.accept(swerveTrajectory, starting);
    } else if (sample instanceof DifferentialSample) {
      TrajectoryLogger<DifferentialSample> differentialLogger =
          (TrajectoryLogger<DifferentialSample>) trajLogger;
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
    logTrajectory(true);
  }

  @SuppressWarnings("unchecked")
  private void cmdExecute() {
    TrajectorySample<?> sample =
        this.trajectory.sampleAt(timeIntoTrajectory(), mirrorTrajectory.getAsBoolean());

    ChassisSpeeds chassisSpeeds = DEFAULT_CHASSIS_SPEEDS;

    if (sample instanceof SwerveSample) {
      ControlFunction<SwerveSample> swerveController =
          (ControlFunction<SwerveSample>) this.controller;
      SwerveSample swerveSample = (SwerveSample) sample;
      chassisSpeeds = swerveController.apply(poseSupplier.get(), swerveSample);
    } else if (sample instanceof DifferentialSample) {
      ControlFunction<DifferentialSample> differentialController =
          (ControlFunction<DifferentialSample>) this.controller;
      DifferentialSample differentialSample = (DifferentialSample) sample;
      chassisSpeeds = differentialController.apply(poseSupplier.get(), differentialSample);
    }

    outputChassisSpeeds.accept(chassisSpeeds);
  }

  private void cmdEnd(boolean interrupted) {
    timer.stop();
    if (interrupted) {
      outputChassisSpeeds.accept(new ChassisSpeeds());
    } else {
      outputChassisSpeeds.accept(trajectory.getFinalSample().getChassisSpeeds());
    }
    isActive = false;
    logTrajectory(false);
  }

  private boolean cmdIsFinished() {
    return timeIntoTrajectory() > totalTime();
  }

  /**
   * Creates a command that allocates the drive subsystem and follows the trajectory using the
   * factories control function
   *
   * @return The command that will follow the trajectory
   */
  public CommandExt cmd() {
    // if the trajectory is empty, return a command that will print an error
    if (trajectory.samples().isEmpty()) {
      return new CommandExt(
          driveSubsystem
              .runOnce(
                  () -> {
                    DriverStation.reportError("Trajectory " + name + " has no samples", false);
                  })
              .withName("Trajectory_" + name));
    }
    return new CommandExt(
        new FunctionalCommand(
                this::cmdInitialize,
                this::cmdExecute,
                this::cmdEnd,
                this::cmdIsFinished,
                driveSubsystem)
            .withName("Trajectory_" + name));
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
    return Optional.of(trajectory.getInitialPose(mirrorTrajectory.getAsBoolean()));
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
    return Optional.of(trajectory.getFinalPose(mirrorTrajectory.getAsBoolean()));
  }

  /**
   * Returns a trigger that is true while the trajectory is scheduled.
   *
   * @return A trigger that is true while the trajectory is scheduled.
   */
  public TriggerExt active() {
    return new TriggerExt(loop, () -> this.isActive);
  }

  /**
   * Returns a trigger that is true while the command is not scheduled.
   *
   * <p>The same as calling <code>active().negate()</code>.
   *
   * @return A trigger that is true while the command is not scheduled.
   */
  public TriggerExt inactive() {
    return TriggerExt.from(active().negate());
  }

  /**
   * Returns a trigger that has a rising edge when the command finishes, this edge will fall again
   * the next cycle.
   *
   * <p>This is not a substitute for the {@link #inactive()} trigger, inactive will stay true until
   * the trajectory is scheduled again and will also be true if thus trajectory has never been
   * scheduled.
   *
   * @return A trigger that is true when the command is finished.
   */
  public TriggerExt done() {
    return new TriggerExt(
        loop,
        new BooleanSupplier() {
          boolean wasJustActive = false;

          public boolean getAsBoolean() {
            if (isActive) {
              wasJustActive = true;
            } else if (wasJustActive) {
              wasJustActive = false;
              return true;
            }
            return false;
          }
        });
  }

  /**
   * Returns a trigger that will go true for 1 cycle when the desired time has elapsed
   *
   * @param timeSinceStart The time since the command started in seconds.
   * @return A trigger that is true when timeSinceStart has elapsed.
   */
  public TriggerExt atTime(double timeSinceStart) {
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
    return new TriggerExt(
        loop,
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
  public TriggerExt atTime(String eventName) {
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

    // The user probably expects an event to exist if theyre trying to do something at that event,
    // report the missing event.
    if (!foundEvent) {
      DriverStation.reportWarning("Event \"" + eventName + "\" not found for " + name, true);
    }

    return TriggerExt.from(trig);
  }

  // private because this is a terrible way to schedule stuff
  private TriggerExt atPose(Pose2d pose, double toleranceMeters) {
    Translation2d checkedTrans =
        mirrorTrajectory.getAsBoolean()
            ? AllianceFlipUtil.flip(pose.getTranslation())
            : pose.getTranslation();
    return new TriggerExt(
        loop,
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
  public TriggerExt atPose(String eventName, double toleranceMeters) {
    boolean foundEvent = false;
    TriggerExt trig = offTrigger;

    for (var event : trajectory.getEvents(eventName)) {
      // This could create alot of objects, could be done a more efficient way
      // with having it all be 1 trigger that just has a list of posess and checks each one each
      // cycle or something like that.
      // If choreo starts proposing memory issues we can look into this.
      Pose2d pose = trajectory.sampleAt(event.timestamp, mirrorTrajectory.getAsBoolean()).getPose();
      trig = TriggerExt.from(trig.or(atPose(pose, toleranceMeters)));
      foundEvent = true;
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
  public TriggerExt atPose(String eventName) {
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
  public TriggerExt atTimeAndPlace(String eventName, double toleranceMeters) {
    return TriggerExt.from(atTime(eventName).and(atPose(eventName, toleranceMeters)));
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
  public TriggerExt atTimeAndPlace(String eventName) {
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
}
