// Copyright (c) Choreo contributors

package choreo.auto;

import choreo.Choreo;
import choreo.Choreo.TrajectoryCache;
import choreo.Choreo.TrajectoryLogger;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.RobotBase;
import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.Subsystem;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.function.BiConsumer;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;

/**
 * A factory used to create autonomous routines.
 *
 * <p>Here is an example of how to use this class to create an auto routine:
 *
 * <h2>Example using <code>Trigger</code>s</h2>
 *
 * <pre><code>
 * public AutoRoutine shootThenMove(AutoFactory factory) {
 *   // Create a new auto routine to return
 *   var routine = factory.newRoutine();
 *
 *   // Create a trajectory that moves the robot 2 meters
 *   AutoTrajectory trajectory = factory.trajectory("move2meters", routine);
 *
 *   // Will automatically run the shoot command when the auto routine is first polled
 *   routine.enabled().onTrue(shooter.shoot());
 *
 *   // Gets a trigger from the shooter to if the shooter has a note, and will run the trajectory
 *   // command when the shooter does not have a note
 *   routine.enabled().and(shooter.hasNote()).onFalse(trajectory.cmd());
 *
 *   return routine;
 * }
 * </code></pre>
 *
 * <h2>Example using <code>CommandGroup</code>s</h2>
 *
 * <pre><code>
 * public Command shootThenMove(AutoFactory factory) {
 *   // Create a trajectory that moves the robot 2 meters
 *   Command trajectory = factory.trajectoryCommand("move2meters");
 *
 *   return shooter.shoot()
 *      .andThen(trajectory)
 *      .withName("ShootThenMove");
 * }
 * </code></pre>
 */
public class AutoFactory {
  static final AutoRoutine VOID_ROUTINE =
      new AutoRoutine("VOID-ROUTINE") {
        private final EventLoop loop = new EventLoop();

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
        public Trigger enabled() {
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
  private final BiConsumer<Pose2d, ? extends TrajectorySample<?>> controller;
  private final BooleanSupplier mirrorTrajectory;
  private final Subsystem driveSubsystem;
  private final AutoBindings bindings = new AutoBindings();
  private final Optional<TrajectoryLogger<? extends TrajectorySample<?>>> trajectoryLogger;

  /**
   * Its recommended to use the {@link Choreo#createAutoFactory} to create a new instance of this
   * class.
   *
   * @param <SampleType> {@link Choreo#createAutoFactory}
   * @param poseSupplier {@link Choreo#createAutoFactory}
   * @param controller {@link Choreo#createAutoFactory}
   * @param mirrorTrajectory {@link Choreo#createAutoFactory}
   * @param driveSubsystem {@link Choreo#createAutoFactory}
   * @param bindings {@link Choreo#createAutoFactory}
   * @param trajectoryLogger {@link Choreo#createAutoFactory}
   */
  public <SampleType extends TrajectorySample<SampleType>> AutoFactory(
      Supplier<Pose2d> poseSupplier,
      BiConsumer<Pose2d, SampleType> controller,
      BooleanSupplier mirrorTrajectory,
      Subsystem driveSubsystem,
      AutoBindings bindings,
      Optional<TrajectoryLogger<SampleType>> trajectoryLogger) {
    this.poseSupplier = poseSupplier;
    this.controller = controller;
    this.mirrorTrajectory = mirrorTrajectory;
    this.driveSubsystem = driveSubsystem;
    this.bindings.merge(bindings);
    this.trajectoryLogger =
        trajectoryLogger.map(logger -> (TrajectoryLogger<? extends TrajectorySample<?>>) logger);
  }

  /**
   * Creates a new {@link AutoRoutine}.
   *
   * @param name The name of the {@link AutoRoutine}.
   * @return A new {@link AutoRoutine}.
   * @see AutoRoutine
   * @see #voidRoutine
   */
  public AutoRoutine newRoutine(String name) {
    // Clear cache in simulation to allow a form of "hot-reloading" trajectories
    if (RobotBase.isSimulation()) {
      clearCache();
    }

    return new AutoRoutine(name);
  }

  /**
   * An {@link AutoRoutine} that cannot have any side-effects, it stores no state and does nothing
   * when polled.
   *
   * @return A void {@link AutoRoutine}.
   * @see #newRoutine
   */
  public AutoRoutine voidRoutine() {
    return VOID_ROUTINE;
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param routine The {@link AutoRoutine} to register this trajectory under.
   * @return A new auto trajectory.
   */
  public AutoTrajectory trajectory(String trajectoryName, AutoRoutine routine) {
    Optional<? extends Trajectory<?>> optTrajectory =
        trajectoryCache.loadTrajectory(trajectoryName);
    Trajectory<?> trajectory;
    if (optTrajectory.isPresent()) {
      trajectory = optTrajectory.get();
    } else {
      DriverStation.reportError("Could not load trajectory: " + trajectoryName, false);
      trajectory = new Trajectory<SwerveSample>(trajectoryName, List.of(), List.of(), List.of());
    }
    return trajectory(trajectory, routine);
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @param routine The {@link AutoRoutine} to register this trajectory under.
   * @return A new auto trajectory.
   */
  public AutoTrajectory trajectory(
      String trajectoryName, final int splitIndex, AutoRoutine routine) {
    Optional<? extends Trajectory<?>> optTrajectory =
        trajectoryCache.loadTrajectory(trajectoryName, splitIndex);
    Trajectory<?> trajectory;
    if (optTrajectory.isPresent()) {
      trajectory = optTrajectory.get();
    } else {
      DriverStation.reportError("Could not load trajectory: " + trajectoryName, false);
      trajectory = new Trajectory<SwerveSample>(trajectoryName, List.of(), List.of(), List.of());
    }
    return trajectory(trajectory, routine);
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param <SampleType> The type of the trajectory samples.
   * @param trajectory The trajectory to use.
   * @param routine The {@link AutoRoutine} to register this trajectory under.
   * @return A new auto trajectory.
   */
  @SuppressWarnings("unchecked")
  public <SampleType extends TrajectorySample<SampleType>> AutoTrajectory trajectory(
      Trajectory<SampleType> trajectory, AutoRoutine routine) {
    // type solidify everything
    final Trajectory<SampleType> solidTrajectory = trajectory;
    final BiConsumer<Pose2d, SampleType> solidController =
        (BiConsumer<Pose2d, SampleType>) this.controller;
    final Optional<TrajectoryLogger<SampleType>> solidLogger =
        this.trajectoryLogger.map(logger -> (TrajectoryLogger<SampleType>) logger);
    return new AutoTrajectory(
        trajectory.name(),
        solidTrajectory,
        poseSupplier,
        solidController,
        mirrorTrajectory,
        solidLogger,
        driveSubsystem,
        routine,
        bindings);
  }

  /**
   * Creates a new auto trajectory command to be used in an auto routine.
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
   * @return A new auto trajectory.
   */
  public Command trajectoryCommand(String trajectoryName) {
    return trajectory(trajectoryName, VOID_ROUTINE).cmd();
  }

  /**
   * Creates a new auto trajectory command to be used in an auto routine.
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
   * @return A new auto trajectory.
   */
  public Command trajectoryCommand(String trajectoryName, final int splitIndex) {
    return trajectory(trajectoryName, splitIndex, VOID_ROUTINE).cmd();
  }

  /**
   * Creates a new auto trajectory command to be used in an auto routine.
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
   * @return A new auto trajectory.
   */
  public <SampleType extends TrajectorySample<SampleType>> Command trajectoryCommand(
      Trajectory<SampleType> trajectory) {
    return trajectory(trajectory, VOID_ROUTINE).cmd();
  }

  /**
   * Creates an {@link AutoRoutine} with the name of the command. The command is the bound to the
   * routine's enabled trigger. This is useful for adding a {@link Command} composition based auto
   * to the {@link choreo.auto.AutoChooser}.
   *
   * @param cmd The command to bind to the routine.
   * @return A new auto routine.
   */
  public AutoRoutine commandAsAutoRoutine(Command cmd) {
    AutoRoutine routine = newRoutine(cmd.getName());
    routine.enabled().onTrue(cmd);
    return routine;
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
   * the same trajectory multiple times. This can have the side effect of keeping a single copy of
   * every trajectory ever loaded in memory aslong as the factory is loaded. This method clears the
   * cache of all trajectories.
   *
   * <p><b>Usage Note:</b>
   *
   * <p>Never clearing the cache is unlikely to have an impact on the robots performance on a rio 2
   */
  public void clearCache() {
    trajectoryCache.clear();
  }
}
