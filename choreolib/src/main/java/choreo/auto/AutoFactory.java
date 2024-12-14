// Copyright (c) Choreo contributors

package choreo.auto;

import static edu.wpi.first.util.ErrorMessages.requireNonNullParam;

import choreo.Choreo.TrajectoryCache;
import choreo.Choreo.TrajectoryLogger;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import edu.wpi.first.hal.FRCNetComm.tResourceType;
import edu.wpi.first.hal.HAL;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj.RobotBase;
import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.Subsystem;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.function.Supplier;

/**
 * A factory used to create {@link AutoRoutine}s and {@link AutoTrajectory}s.
 *
 * @see <a href="https://choreo.autos/choreolib/auto-routines">Auto Routine Docs</a>
 */
public class AutoFactory {
  static final AutoRoutine VOID_ROUTINE =
      new AutoRoutine(null, "VOID-ROUTINE", new EventLoop()) {
        @Override
        public Command cmd() {
          return Commands.none().withName("VoidAutoRoutine");
        }

        @Override
        public Command cmd(BooleanSupplier _finishCondition) {
          return cmd();
        }

        @Override
        public void poll() {}

        @Override
        public void reset() {}

        @Override
        public Trigger active() {
          return new Trigger(loop, () -> false);
        }
      };

  /** A class used to bind commands to events in all trajectories created by this factory. */
  public static class AutoBindings {
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

    private void merge(AutoBindings other) {
      if (other == null) {
        return;
      }
      bindings.putAll(other.bindings);
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
  private final Supplier<Optional<Alliance>> alliance;
  private final BooleanSupplier useAllianceFlipping;
  private final Subsystem driveSubsystem;
  private final AutoBindings bindings = new AutoBindings();
  private final TrajectoryLogger<? extends TrajectorySample<?>> trajectoryLogger;

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
   * @param driveSubsystem The drive {@link Subsystem} to require for {@link AutoTrajectory} {@link
   *     Command}s.
   * @param useAllianceFlipping If this returns true, when on the red alliance, the path will be
   *     mirrored to the opposite side, while keeping the same coordinate system origin. This will
   *     be called every loop during the command.
   * @param bindings Universal trajectory event bindings.
   * @param trajectoryLogger A {@link TrajectoryLogger} to log {@link Trajectory} as they start and
   *     finish.
   * @param alliance A custom supplier of the current alliance to use instead of {@link
   *     DriverStation#getAlliance}.
   * @see AutoChooser using this factory with AutoChooser to generate auto routines.
   */
  public <SampleType extends TrajectorySample<SampleType>> AutoFactory(
      Supplier<Pose2d> poseSupplier,
      Consumer<Pose2d> resetOdometry,
      Consumer<SampleType> controller,
      BooleanSupplier useAllianceFlipping,
      Subsystem driveSubsystem,
      AutoBindings bindings,
      TrajectoryLogger<SampleType> trajectoryLogger,
      Supplier<Optional<Alliance>> alliance) {
    requireNonNullParam(poseSupplier, "poseSupplier", "AutoFactory");
    requireNonNullParam(resetOdometry, "resetOdometry", "AutoFactory");
    requireNonNullParam(controller, "controller", "AutoFactory");
    requireNonNullParam(driveSubsystem, "driveSubsystem", "AutoFactory");
    requireNonNullParam(useAllianceFlipping, "useAllianceFlipping", "AutoFactory");
    requireNonNullParam(bindings, "bindings", "AutoFactory");

    this.poseSupplier = poseSupplier;
    this.resetOdometry = resetOdometry;
    this.controller = controller;
    this.driveSubsystem = driveSubsystem;
    this.useAllianceFlipping = useAllianceFlipping;
    this.bindings.merge(bindings);
    this.trajectoryLogger = trajectoryLogger;
    this.alliance = alliance;
    HAL.report(tResourceType.kResourceType_ChoreoTrigger, 1);
  }

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
   * @param driveSubsystem The drive {@link Subsystem} to require for {@link AutoTrajectory} {@link
   *     Command}s.
   * @param useAllianceFlipping If this returns true, when on the red alliance, the path will be
   *     mirrored to the opposite side, while keeping the same coordinate system origin. This will
   *     be called every loop during the command.
   * @param bindings Universal trajectory event bindings.
   * @param trajectoryLogger A {@link TrajectoryLogger} to log {@link Trajectory} as they start and
   *     finish.
   * @see AutoChooser using this factory with AutoChooser to generate auto routines.
   */
  public <SampleType extends TrajectorySample<SampleType>> AutoFactory(
      Supplier<Pose2d> poseSupplier,
      Consumer<Pose2d> resetOdometry,
      Consumer<SampleType> controller,
      BooleanSupplier useAllianceFlipping,
      Subsystem driveSubsystem,
      AutoBindings bindings,
      TrajectoryLogger<SampleType> trajectoryLogger) {
    this(
        poseSupplier,
        resetOdometry,
        controller,
        useAllianceFlipping,
        driveSubsystem,
        bindings,
        trajectoryLogger,
        DriverStation::getAlliance);
  }

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
   * @param driveSubsystem The drive {@link Subsystem} to require for {@link AutoTrajectory} {@link
   *     Command}s.
   * @param useAllianceFlipping If this returns true, when on the red alliance, the path will be
   *     mirrored to the opposite side, while keeping the same coordinate system origin. This will
   *     be called every loop during the command.
   * @param bindings Universal trajectory event bindings.
   * @see AutoChooser using this factory with AutoChooser to generate auto routines.
   */
  public <SampleType extends TrajectorySample<SampleType>> AutoFactory(
      Supplier<Pose2d> poseSupplier,
      Consumer<Pose2d> resetOdometry,
      Consumer<SampleType> controller,
      BooleanSupplier useAllianceFlipping,
      Subsystem driveSubsystem,
      AutoBindings bindings) {
    this(
        poseSupplier,
        resetOdometry,
        controller,
        useAllianceFlipping,
        driveSubsystem,
        bindings,
        (sample, isStart) -> {},
        DriverStation::getAlliance);
  }

  /**
   * Creates a new {@link AutoRoutine}.
   *
   * @param name The name of the {@link AutoRoutine}.
   * @return A new {@link AutoRoutine}.
   */
  public AutoRoutine newRoutine(String name) {
    // Clear cache in simulation to allow a form of "hot-reloading" trajectories
    if (RobotBase.isSimulation()) {
      trajectoryCache.clear();
    }

    return new AutoRoutine(this, name, this::allianceKnownOrIgnored);
  }

  private boolean allianceKnownOrIgnored() {
    return !useAllianceFlipping.getAsBoolean() || alliance.get().isPresent();
  }

  /**
   * A package protected method to create a new {@link AutoTrajectory} to be used in an {@link
   * AutoRoutine}.
   *
   * @see AutoRoutine#trajectory(String)
   */
  AutoTrajectory trajectory(String trajectoryName, AutoRoutine routine) {
    Optional<? extends Trajectory<?>> optTrajectory =
        trajectoryCache.loadTrajectory(trajectoryName);
    Trajectory<?> trajectory;
    if (optTrajectory.isPresent()) {
      trajectory = optTrajectory.get();
    } else {
      trajectory = new Trajectory<SwerveSample>(trajectoryName, List.of(), List.of(), List.of());
    }
    return trajectory(trajectory, routine);
  }

  /**
   * A package protected method to create a new {@link AutoTrajectory} to be used in an {@link
   * AutoRoutine}.
   *
   * @see AutoRoutine#trajectory(String, int)
   */
  AutoTrajectory trajectory(String trajectoryName, final int splitIndex, AutoRoutine routine) {
    Optional<? extends Trajectory<?>> optTrajectory =
        trajectoryCache.loadTrajectory(trajectoryName, splitIndex);
    Trajectory<?> trajectory;
    if (optTrajectory.isPresent()) {
      trajectory = optTrajectory.get();
    } else {
      trajectory = new Trajectory<SwerveSample>(trajectoryName, List.of(), List.of(), List.of());
    }
    return trajectory(trajectory, routine);
  }

  /**
   * A package protected method to create a new {@link AutoTrajectory} to be used in an {@link
   * AutoRoutine}.
   *
   * @see AutoRoutine#trajectory(Trajectory)
   */
  @SuppressWarnings("unchecked")
  <ST extends TrajectorySample<ST>> AutoTrajectory trajectory(
      Trajectory<ST> trajectory, AutoRoutine routine) {
    // type solidify everything
    final Trajectory<ST> solidTrajectory = trajectory;
    final Consumer<ST> solidController = (Consumer<ST>) this.controller;
    return new AutoTrajectory(
        trajectory.name(),
        solidTrajectory,
        poseSupplier,
        resetOdometry,
        solidController,
        useAllianceFlipping,
        alliance,
        (TrajectoryLogger<ST>) trajectoryLogger,
        driveSubsystem,
        routine,
        bindings);
  }

  /**
   * Creates a new {@link AutoTrajectory} command to be used in an auto routine.
   *
   * <p><b>Important </b>
   *
   * <p>{@link #trajectoryCommand} and {@link #trajectory} methods should not be mixed in the same
   * auto routine. {@link #trajectoryCommand} is used as an escape hatch for teams that don't need
   * the benefits of the {@link #trajectory} method and its {@link Trigger} API. {@link
   * #trajectoryCommand} does not invoke bindings added via calling {@link #bind} or {@link
   * AutoBindings} passed into the factory constructor.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public Command trajectoryCommand(String trajectoryName) {
    return trajectory(trajectoryName, VOID_ROUTINE).cmd();
  }

  /**
   * Creates a new {@link AutoTrajectory} command to be used in an auto routine.
   *
   * <p><b>Important </b>
   *
   * <p>{@link #trajectoryCommand} and {@link #trajectory} methods should not be mixed in the same
   * auto routine. {@link #trajectoryCommand} is used as an escape hatch for teams that don't need
   * the benefits of the {@link #trajectory} method and its {@link Trigger} API. {@link
   * #trajectoryCommand} does not invoke bindings added via calling {@link #bind} or {@link
   * AutoBindings} passed into the factory constructor.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public Command trajectoryCommand(String trajectoryName, final int splitIndex) {
    return trajectory(trajectoryName, splitIndex, VOID_ROUTINE).cmd();
  }

  /**
   * Creates a new {@link AutoTrajectory} command to be used in an auto routine.
   *
   * <p><b>Important </b>
   *
   * <p>{@link #trajectoryCommand} and {@link #trajectory} methods should not be mixed in the same
   * auto routine. {@link #trajectoryCommand} is used as an escape hatch for teams that don't need
   * the benefits of the {@link #trajectory} method and its {@link Trigger} API. {@link
   * #trajectoryCommand} does not invoke bindings added via calling {@link #bind} or {@link
   * AutoBindings} passed into the factory constructor.
   *
   * @param <SampleType> The type of the trajectory samples.
   * @param trajectory The trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public <SampleType extends TrajectorySample<SampleType>> Command trajectoryCommand(
      Trajectory<SampleType> trajectory) {
    return trajectory(trajectory, VOID_ROUTINE).cmd();
  }

  /**
   * Creates a command that resets the robot's odometry to the start of a trajectory.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @return A command that resets the robot's odometry.
   */
  public Command resetOdometry(String trajectoryName) {
    return trajectory(trajectoryName, VOID_ROUTINE).resetOdometry();
  }

  /**
   * Creates a command that resets the robot's odometry to the start of a trajectory.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @return A command that resets the robot's odometry.
   */
  public Command resetOdometry(String trajectoryName, final int splitIndex) {
    return trajectory(trajectoryName, splitIndex, VOID_ROUTINE).resetOdometry();
  }

  /**
   * Creates a command that resets the robot's odometry to the start of a trajectory.
   *
   * @param <SampleType> The type of the trajectory samples.
   * @param trajectory The trajectory to use.
   * @return A command that resets the robot's odometry.
   */
  public <SampleType extends TrajectorySample<SampleType>> Command resetOdometry(
      Trajectory<SampleType> trajectory) {
    return trajectory(trajectory, VOID_ROUTINE).resetOdometry();
  }

  /**
   * Binds a command to an event in all trajectories created after this point.
   *
   * @param name The name of the trajectory to bind the command to.
   * @param cmd The command to bind to the trajectory.
   */
  public void bind(String name, Command cmd) {
    bindings.bind(name, cmd);
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
