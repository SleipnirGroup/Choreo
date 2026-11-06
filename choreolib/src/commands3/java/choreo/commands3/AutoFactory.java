// Copyright (c) Choreo contributors

package choreo.commands3;

import static org.wpilib.units.Units.Seconds;
import static org.wpilib.util.ErrorMessages.requireNonNullParam;

import choreo.Choreo.TrajectoryCache;
import choreo.Choreo.TrajectoryLogger;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import choreo.util.ChoreoAllianceFlipUtil;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;
import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.driverstation.Alliance;
import org.wpilib.driverstation.MatchState;
import org.wpilib.framework.OpModeRobot;
import org.wpilib.framework.RobotBase;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.hardware.hal.RobotMode;
import org.wpilib.math.geometry.Pose2d;

/**
 * A factory used to create {@link AutoRoutine}s and {@link AutoTrajectory}s for Commands v3.
 *
 * @see <a href="https://choreo.autos/choreolib/auto-routines">Auto Routine Docs</a>
 */
public class AutoFactory {
  static record AllianceContext(
      boolean useAllianceFlipping, Supplier<Optional<Alliance>> allianceGetter) {
    boolean allianceKnownOrIgnored() {
      return allianceGetter.get().isPresent() || !useAllianceFlipping;
    }

    boolean doFlip() {
      return useAllianceFlipping
          && allianceGetter
              .get()
              .orElseThrow(
                  () -> new RuntimeException("Flip check was called with an unknown alliance"))
              .equals(Alliance.RED);
    }

    Optional<Alliance> alliance() {
      return allianceGetter.get();
    }

    Supplier<Optional<Pose2d>> getFlippedPose(Optional<Pose2d> bluePose) {
      return ChoreoAllianceFlipUtil.optionalFlippedPose2d(
          bluePose, this::alliance, useAllianceFlipping);
    }
  }

  /** A class used to bind commands to events in all trajectories created by this factory. */
  static class AutoBindings {
    private HashMap<String, Command> bindings = new HashMap<>();

    /** Default constructor. */
    public AutoBindings() {}

    /**
     * Binds a command to an event in all trajectories created by the factory using this bindings.
     *
     * @param name The name of the event to bind the command to.
     * @param cmd The command to bind to the event.
     * @return The bindings object for chaining.
     */
    public AutoBindings bind(String name, Command cmd) {
      bindings.put(name, cmd);
      return this;
    }

    /**
     * Gets the bindings map.
     *
     * @return The bindings map.
     */
    HashMap<String, Command> getBindings() {
      return bindings;
    }
  }

  private final TrajectoryCache trajectoryCache = new TrajectoryCache();
  private final Supplier<Pose2d> poseSupplier;
  private final Consumer<Pose2d> resetOdometry;
  private final Consumer<? extends TrajectorySample<?>> controller;
  final AllianceContext allianceCtx;
  private final Mechanism driveMechanism;
  private final AutoBindings bindings = new AutoBindings();
  private final TrajectoryLogger<? extends TrajectorySample<?>> trajectoryLogger;
  private final AutoRoutine voidRoutine;

  /**
   * Create a factory that can be used to create {@link AutoRoutine} and {@link AutoTrajectory}.
   *
   * @param <SampleType> The type of samples in the trajectory.
   * @param poseSupplier A function that returns the current field-relative {@link Pose2d} of the
   *     robot.
   * @param resetOdometry A function that receives a field-relative {@link Pose2d} to reset the
   *     robot's odometry to.
   * @param controller A function that receives the current {@link SampleType} and controls the
   *     robot.
   * @param useAllianceFlipping If this is true, when on the red alliance, the path will be mirrored
   *     to the opposite side, while keeping the same coordinate system origin.
   * @param driveMechanism The drive {@link Mechanism} to require for {@link AutoTrajectory} {@link
   *     Command}s.
   * @param trajectoryLogger A {@link TrajectoryLogger} to log {@link Trajectory} as they start and
   *     finish.
   */
  public <SampleType extends TrajectorySample<SampleType>> AutoFactory(
      Supplier<Pose2d> poseSupplier,
      Consumer<Pose2d> resetOdometry,
      Consumer<SampleType> controller,
      boolean useAllianceFlipping,
      Mechanism driveMechanism,
      TrajectoryLogger<SampleType> trajectoryLogger) {
    requireNonNullParam(poseSupplier, "poseSupplier", "AutoFactory");
    requireNonNullParam(resetOdometry, "resetOdometry", "AutoFactory");
    requireNonNullParam(controller, "controller", "AutoFactory");
    requireNonNullParam(driveMechanism, "driveMechanism", "AutoFactory");
    requireNonNullParam(useAllianceFlipping, "useAllianceFlipping", "AutoFactory");

    this.poseSupplier = poseSupplier;
    this.resetOdometry = resetOdometry;
    this.controller = controller;
    this.driveMechanism = driveMechanism;
    this.allianceCtx = new AllianceContext(useAllianceFlipping, MatchState::getAlliance);
    this.trajectoryLogger = trajectoryLogger;
    HAL.reportUsage("ChoreoTrigger", 1, "AutoFactory");

    voidRoutine =
        new AutoRoutine(this, "VOID-ROUTINE") {
          @Override
          boolean isActive() {
            return true;
          }

          @Override
          void register(AutoTrajectory trajectory) {
            // Never started or reset, and shared by every trajectoryCmd, so don't hold on to them.
          }
        };
  }

  /**
   * Create a factory that can be used to create {@link AutoRoutine} and {@link AutoTrajectory}.
   *
   * @param <ST> {@link choreo.trajectory.DifferentialSample} or {@link
   *     choreo.trajectory.SwerveSample}
   * @param poseSupplier A function that returns the current field-relative {@link Pose2d} of the
   *     robot.
   * @param resetOdometry A function that receives a field-relative {@link Pose2d} to reset the
   *     robot's odometry to.
   * @param controller A function that receives the current {@link ST} and controls the robot.
   * @param useAllianceFlipping If this returns true, when on the red alliance, the path will be
   *     mirrored to the opposite side, while keeping the same coordinate system origin.
   * @param driveMechanism The drive {@link Mechanism} to require for {@link AutoTrajectory} {@link
   *     Command}s.
   */
  public <ST extends TrajectorySample<ST>> AutoFactory(
      Supplier<Pose2d> poseSupplier,
      Consumer<Pose2d> resetOdometry,
      Consumer<ST> controller,
      boolean useAllianceFlipping,
      Mechanism driveMechanism) {
    this(
        poseSupplier,
        resetOdometry,
        controller,
        useAllianceFlipping,
        driveMechanism,
        (sample, isStart) -> {});
  }

  /**
   * Registers an autonomous routine as an opmode named {@code name}, shown on the Driver Station.
   *
   * <p>{@code body} does not run now. It runs each time the opmode is selected on the Driver
   * Station, on a fresh {@link AutoRoutine}, which is what scopes the triggers and commands it
   * creates to that opmode. The routine object is deliberately not returned, so it can't be built
   * ahead of time (such as in the robot constructor) where it would not be scoped.
   *
   * <p>This does not publish the opmode to the Driver Station. Call {@link
   * OpModeRobot#publishOpModes()} after registering all of your opmodes, such as at the end of the
   * robot constructor, or the routine will not appear in the Driver Station's opmode list.
   *
   * <pre><code>
   * factory.addRoutine(this, "Two Piece", routine -&gt; {
   *   var first = routine.trajectory("first");
   *   var second = routine.trajectory("second");
   *   routine.active().onTrue(first.resetOdometry().andThen(first.cmd()).withAutomaticName());
   *   first.chain(second);
   * });
   * </code></pre>
   *
   * @param robot The robot to register the opmode with.
   * @param name The name of the opmode, as shown on the Driver Station. Must be unique among
   *     autonomous opmodes.
   * @param body A function that receives the new routine and sets up its triggers.
   */
  public void addRoutine(OpModeRobot robot, String name, Consumer<AutoRoutine> body) {
    addRoutine(robot, name, "", body);
  }

  /**
   * Registers an autonomous routine as an opmode named {@code name} in the given group, shown on
   * the Driver Station.
   *
   * @param robot The robot to register the opmode with.
   * @param name The name of the opmode, as shown on the Driver Station. Must be unique among
   *     autonomous opmodes.
   * @param group The group the opmode is listed under on the Driver Station.
   * @param body A function that receives the new routine and sets up its triggers.
   * @see #addRoutine(OpModeRobot, String, Consumer)
   */
  public void addRoutine(OpModeRobot robot, String name, String group, Consumer<AutoRoutine> body) {
    requireNonNullParam(robot, "robot", "addRoutine");
    requireNonNullParam(name, "name", "addRoutine");
    requireNonNullParam(group, "group", "addRoutine");
    requireNonNullParam(body, "body", "addRoutine");
    robot.addOpMode(RobotMode.AUTONOMOUS, name, group, () -> buildRoutine(name, body));
  }

  /** Builds a routine. Runs when its opmode is selected, so the routine's triggers are scoped. */
  private AutoRoutine buildRoutine(String name, Consumer<AutoRoutine> body) {
    // Clear cache in simulation to allow a form of "hot-reloading" trajectories
    if (RobotBase.isSimulation()) {
      trajectoryCache.clear();
    }

    var routine = new AutoRoutine(this, name);
    body.accept(routine);
    return routine;
  }

  /**
   * A package protected method to create a new {@link AutoTrajectory} to be used in an {@link
   * AutoRoutine}.
   *
   * @see AutoRoutine#trajectory(String)
   */
  AutoTrajectory trajectory(String trajectoryName, AutoRoutine routine, boolean useBindings) {
    Optional<? extends Trajectory<?>> optTrajectory =
        trajectoryCache.loadTrajectory(trajectoryName);
    Trajectory<?> trajectory;
    if (optTrajectory.isPresent()) {
      trajectory = optTrajectory.get();
    } else {
      trajectory = new Trajectory<SwerveSample>(trajectoryName, List.of(), List.of(), List.of());
    }
    return trajectory(trajectory, routine, useBindings);
  }

  /**
   * A package protected method to create a new {@link AutoTrajectory} to be used in an {@link
   * AutoRoutine}.
   *
   * @see AutoRoutine#trajectory(String, int)
   */
  AutoTrajectory trajectory(
      String trajectoryName, final int splitIndex, AutoRoutine routine, boolean useBindings) {
    Optional<? extends Trajectory<?>> optTrajectory =
        trajectoryCache.loadTrajectory(trajectoryName, splitIndex);
    Trajectory<?> trajectory;
    if (optTrajectory.isPresent()) {
      trajectory = optTrajectory.get();
    } else {
      trajectory = new Trajectory<SwerveSample>(trajectoryName, List.of(), List.of(), List.of());
    }
    return trajectory(trajectory, routine, useBindings);
  }

  /**
   * A package protected method to create a new {@link AutoTrajectory} to be used in an {@link
   * AutoRoutine}.
   *
   * @see AutoRoutine#trajectory(Trajectory)
   */
  <ST extends TrajectorySample<ST>> AutoTrajectory trajectory(
      Trajectory<ST> trajectory, AutoRoutine routine, boolean useBindings) {
    return trajectory(trajectory, routine, useBindings, Function.identity());
  }

  /**
   * A package protected method to create a new {@link AutoTrajectory} to be used in an {@link
   * AutoRoutine}.
   *
   * @see AutoRoutine#trajectory(Trajectory)
   */
  @SuppressWarnings("unchecked")
  <ST extends TrajectorySample<ST>> AutoTrajectory trajectory(
      Trajectory<ST> trajectory,
      AutoRoutine routine,
      boolean useBindings,
      Function<Trajectory<ST>, Trajectory<ST>> trajectoryTransform) {
    // type solidify everything
    final Trajectory<ST> solidTrajectory = trajectoryTransform.apply(trajectory);
    final Consumer<ST> solidController = (Consumer<ST>) this.controller;
    return new AutoTrajectory(
        trajectory.name(),
        solidTrajectory,
        poseSupplier,
        resetOdometry,
        solidController,
        allianceCtx,
        (TrajectoryLogger<ST>) trajectoryLogger,
        driveMechanism,
        routine,
        useBindings ? bindings : new AutoBindings());
  }

  /**
   * Warms up Choreo so there is no delay at the start of auto. Schedule this command in your Robot
   * constructor:
   *
   * <pre><code>
   *     Scheduler.getDefault().schedule(autoFactory.warmupCmd());
   * </code></pre>
   *
   * <p>The command requires no mechanisms, so it can run while the robot is disabled.
   *
   * @return A command that warms up Choreo's autonomous functionality.
   */
  public Command warmupCmd() {
    var autoTraj = trajectory("", voidRoutine, false);
    autoTraj.suppressWarnings();
    return autoTraj.warmupCmd().withTimeout(Seconds.of(0.5));
  }

  /**
   * Creates a new {@link AutoTrajectory} command to be used in an auto routine.
   *
   * <p>Don't mix {@link #trajectoryCmd} and {@link AutoRoutine#trajectory} in the same auto
   * routine. {@link #trajectoryCmd} is an escape hatch for teams that don't need the trigger API,
   * and it does not run bindings added with {@link #bind}.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public Command trajectoryCmd(String trajectoryName) {
    return trajectory(trajectoryName, voidRoutine, false).cmd();
  }

  /**
   * Creates a new {@link AutoTrajectory} command to be used in an auto routine.
   *
   * <p>See {@link #trajectoryCmd(String)} for caveats.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @param transform A function that takes in the loaded trajectory and applies a transformation to
   *     it, such as left-to-right mirroring.
   * @return A new {@link AutoTrajectory}.
   */
  public Command trajectoryCmd(
      String trajectoryName,
      final int splitIndex,
      Function<AutoTrajectory, AutoTrajectory> transform) {
    return transform.apply(trajectory(trajectoryName, splitIndex, voidRoutine, false)).cmd();
  }

  /**
   * Creates a new {@link AutoTrajectory} command to be used in an auto routine.
   *
   * <p>See {@link #trajectoryCmd(String)} for caveats.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param transform A function that takes in the loaded trajectory and applies a transformation to
   *     it, such as left-to-right mirroring.
   * @return A new {@link AutoTrajectory}.
   */
  public Command trajectoryCmd(
      String trajectoryName, Function<AutoTrajectory, AutoTrajectory> transform) {
    return transform.apply(trajectory(trajectoryName, voidRoutine, false)).cmd();
  }

  /**
   * Creates a new {@link AutoTrajectory} command to be used in an auto routine.
   *
   * <p>See {@link #trajectoryCmd(String)} for caveats.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public Command trajectoryCmd(String trajectoryName, final int splitIndex) {
    return trajectory(trajectoryName, splitIndex, voidRoutine, false).cmd();
  }

  /**
   * Creates a new {@link AutoTrajectory} command to be used in an auto routine.
   *
   * <p>See {@link #trajectoryCmd(String)} for caveats.
   *
   * @param <ST> {@link choreo.trajectory.DifferentialSample} or {@link
   *     choreo.trajectory.SwerveSample}
   * @param trajectory The trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public <ST extends TrajectorySample<ST>> Command trajectoryCmd(Trajectory<ST> trajectory) {
    return trajectory(trajectory, voidRoutine, false).cmd();
  }

  /**
   * Creates a command that resets the robot's odometry to the start of a trajectory.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @return A command that resets the robot's odometry.
   */
  public Command resetOdometry(String trajectoryName) {
    return trajectory(trajectoryName, voidRoutine, false).resetOdometry();
  }

  /**
   * Creates a command that resets the robot's odometry to the start of a trajectory.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @return A command that resets the robot's odometry.
   */
  public Command resetOdometry(String trajectoryName, final int splitIndex) {
    return trajectory(trajectoryName, splitIndex, voidRoutine, false).resetOdometry();
  }

  /**
   * Creates a command that resets the robot's odometry to the start of a trajectory.
   *
   * @param <ST> {@link choreo.trajectory.DifferentialSample} or {@link
   *     choreo.trajectory.SwerveSample}
   * @param trajectory The trajectory to use.
   * @return A command that resets the robot's odometry.
   */
  public <ST extends TrajectorySample<ST>> Command resetOdometry(Trajectory<ST> trajectory) {
    return trajectory(trajectory, voidRoutine, false).resetOdometry();
  }

  /**
   * Creates a command that resets the robot's odometry to the supplied pose
   *
   * @param pose A function that is called when the command is run. It returns an <code>
   *     Optional&lt;Pose2d&gt;</code> of the robot's desired odometry position.
   * @return A command that resets the robot's odometry to the supplied pose, or does nothing if the
   *     supplied Optional is empty.
   */
  public Command resetOdometry(Supplier<Optional<Pose2d>> pose) {
    return Command.requiring(driveMechanism)
        .executing(coroutine -> pose.get().ifPresent(resetOdometry))
        .named("Choreo_ResetOdometry");
  }

  /**
   * Creates a command that resets the robot's odometry to the given pose
   *
   * @param pose An <code>Optional&lt;Pose2d&gt;</code> of the robot's desired odometry position.
   * @param doFlipForAlliance True if the given pose still needs to be flipped according to the
   *     alliance (usually true). False if it is an absolute field position.
   * @return A command that resets the robot's odometry to the given pose (flipped as directed), or
   *     does nothing if the supplied Optional is empty.
   */
  public Command resetOdometry(Optional<Pose2d> pose, boolean doFlipForAlliance) {
    if (pose.isEmpty()) {
      // equivalent to a no-op that still requires the drive mechanism.
      return Command.requiring(driveMechanism)
          .executing(coroutine -> {})
          .named("Choreo_ResetOdometry");
    }
    Supplier<Optional<Pose2d>> supplier =
        doFlipForAlliance ? allianceCtx.getFlippedPose(pose) : (() -> pose);
    return resetOdometry(supplier);
  }

  /**
   * Binds a command to an event in all trajectories created after this point.
   *
   * @param name The name of the trajectory to bind the command to.
   * @param cmd The command to bind to the trajectory.
   * @return The AutoFactory the method was called from.
   */
  public AutoFactory bind(String name, Command cmd) {
    bindings.bind(name, cmd);
    return this;
  }

  /**
   * The {@link AutoFactory} caches trajectories with a {@link TrajectoryCache} to avoid reloading
   * the same trajectory multiple times.
   *
   * @return The trajectory cache.
   */
  public TrajectoryCache cache() {
    return trajectoryCache;
  }
}
