// Copyright (c) Choreo contributors

package choreo.autos;

import choreo.Choreo;
import choreo.Choreo.ChoreoTrajCache;
import choreo.Choreo.ControlFunction;
import choreo.Choreo.TrajectoryLogger;
import choreo.ext.TriggerExt;
import choreo.trajectory.ChorTrajectory;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.TrajSample;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
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
 * A factory used to create autonomous routines.
 *
 * <p>Here is an example of how to use this class to create an auto routine:
 *
 * <h2>Example using <code>Trigger</code>s</h2>
 *
 * <pre><code>
 * public Command shootThenMove(ChoreoAutoFactory factory) {
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
 *   return loopcmd().withName("ShootThenMove");
 * }
 * </code></pre>
 *
 * <h2>Example using <code>CommandGroup</code>s</h2>
 *
 * <pre><code>
 * public Command shootThenMove(ChoreoAutoFactory factory) {
 *   // create a trajectory that moves the robot 2 meters
 *   Command traj = factory.trajCommand("move2meters");
 *
 *   return shooter.shoot()
 *      .andThen(traj)
 *      .withName("ShootThenMove");
 * }
 * </code></pre>
 */
public class AutoFactory {
  private static final AutoLoop VOID_LOOP =
      new AutoLoop("VOID-LOOP") {
        private final EventLoop loop = new EventLoop();

        @Override
        public Command cmd() {
          return Commands.none().withName("VoidLoop:" + name);
        }

        @Override
        public Command cmd(BooleanSupplier finishCondition) {
          return Commands.none().withName("VoidLoop:" + name);
        }

        @Override
        public void poll() {}

        @Override
        public void reset() {}

        @Override
        public TriggerExt enabled() {
          return new TriggerExt(loop, () -> false);
        }
      };

  /** A class used to bind commands to events in all trajectories created by this factory. */
  public static class ChoreoAutoBindings {
    private HashMap<String, Command> bindings = new HashMap<>();

    /** Default constructor. */
    public ChoreoAutoBindings() {}

    /**
     * Binds a command to an event in all trajectories created by the factory using this bindings.
     *
     * @param name The name of the event to bind the command to.
     * @param cmd The command to bind to the event.
     * @return The bindings object for chaining.
     */
    public ChoreoAutoBindings bind(String name, Command cmd) {
      bindings.put(name, cmd);
      return this;
    }

    private void merge(ChoreoAutoBindings other) {
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

  private final ChoreoTrajCache trajCache = new ChoreoTrajCache();
  private final Supplier<Pose2d> poseSupplier;
  private final ControlFunction<? extends TrajSample<?>> controller;
  private final Consumer<ChassisSpeeds> outputChassisSpeeds;
  private final BooleanSupplier mirrorTrajectory;
  private final Subsystem driveSubsystem;
  private final ChoreoAutoBindings bindings = new ChoreoAutoBindings();
  private final Optional<TrajectoryLogger<? extends TrajSample<?>>> trajLogger;

  /**
   * Its reccomended to use the {@link Choreo#createAutoFactory} to create a new instance of this
   * class.
   *
   * @param <SampleType> {@link Choreo#createAutoFactory}
   * @param poseSupplier {@link Choreo#createAutoFactory}
   * @param controller {@link Choreo#createAutoFactory}
   * @param outputChassisSpeeds {@link Choreo#createAutoFactory}
   * @param mirrorTrajectory {@link Choreo#createAutoFactory}
   * @param driveSubsystem {@link Choreo#createAutoFactory}
   * @param bindings {@link Choreo#createAutoFactory}
   * @param trajLogger {@link Choreo#createAutoFactory}
   */
  public <SampleType extends TrajSample<SampleType>> AutoFactory(
      Supplier<Pose2d> poseSupplier,
      ControlFunction<SampleType> controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      Subsystem driveSubsystem,
      ChoreoAutoBindings bindings,
      Optional<TrajectoryLogger<SampleType>> trajLogger) {
    this.poseSupplier = poseSupplier;
    this.controller = controller;
    this.outputChassisSpeeds = outputChassisSpeeds;
    this.mirrorTrajectory = mirrorTrajectory;
    this.driveSubsystem = driveSubsystem;
    this.bindings.merge(bindings);
    this.trajLogger = trajLogger.map(logger -> (TrajectoryLogger<? extends TrajSample<?>>) logger);
  }

  /**
   * Creates a new auto loop to be used to make an auto routine.
   *
   * @param name The name of the auto loop.
   * @return A new auto loop.
   * @see AutoLoop
   * @see #voidLoop
   */
  public AutoLoop newLoop(String name) {
    return new AutoLoop(name);
  }

  /**
   * An Auto Loop that cannot have any side-effects, it stores no state and does nothing when
   * polled.
   *
   * @return A void auto loop.
   * @see AutoLoop
   * @see #newLoop
   */
  public AutoLoop voidLoop() {
    return VOID_LOOP;
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajName The name of the trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public AutoTrajectory traj(String trajName, AutoLoop loop) {
    Optional<? extends ChorTrajectory<?>> optTraj = trajCache.loadTrajectory(trajName);
    ChorTrajectory<?> traj;
    if (optTraj.isPresent()) {
      traj = optTraj.get();
    } else {
      DriverStation.reportError("Could not load trajectory: " + trajName, false);
      traj = new ChorTrajectory<SwerveSample>(trajName, List.of(), List.of(), List.of());
    }
    return traj(traj, loop);
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public AutoTrajectory traj(String trajName, final int splitIndex, AutoLoop loop) {
    Optional<? extends ChorTrajectory<?>> optTraj = trajCache.loadTrajectory(trajName, splitIndex);
    ChorTrajectory<?> traj;
    if (optTraj.isPresent()) {
      traj = optTraj.get();
    } else {
      DriverStation.reportError("Could not load trajectory: " + trajName, false);
      traj = new ChorTrajectory<SwerveSample>(trajName, List.of(), List.of(), List.of());
    }
    return traj(traj, loop);
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param <SampleType> The type of the trajectory samples.
   * @param trajectory The trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  @SuppressWarnings("unchecked")
  public <SampleType extends TrajSample<SampleType>> AutoTrajectory traj(
      ChorTrajectory<SampleType> trajectory, AutoLoop loop) {
    // type solidify everything
    final ChorTrajectory<SampleType> solidTrajectory = trajectory;
    final ControlFunction<SampleType> solidController =
        (ControlFunction<SampleType>) this.controller;
    final Optional<TrajectoryLogger<SampleType>> solidLogger =
        this.trajLogger.map(logger -> (TrajectoryLogger<SampleType>) logger);
    return new AutoTrajectory(
        trajectory.name(),
        solidTrajectory,
        poseSupplier,
        solidController,
        outputChassisSpeeds,
        mirrorTrajectory,
        solidLogger,
        driveSubsystem,
        loop.getLoop(),
        bindings);
  }

  /**
   * Creates a new auto trajectory command to be used in an auto routine.
   *
   * <p><b>Important </b>
   *
   * <p>{@link #trajCommand} and {@link #traj} methods should not be mixed in the same auto routine.
   * {@link #trajCommand} is used as an escape hatch for teams that don't need the benefits of the
   * {@link #traj} method and its {@link Trigger} api. {@link #trajCommand} does not invoke bindings
   * added via calling {@link #bind} or {@link ChoreoAutoBindings} passed into the factory
   * constructor.
   *
   * @param trajName The name of the trajectory to use.
   * @return A new auto trajectory.
   */
  public Command trajCommand(String trajName) {
    return traj(trajName, VOID_LOOP).cmd();
  }

  /**
   * Creates a new auto trajectory command to be used in an auto routine.
   *
   * <p><b>Important </b>
   *
   * <p>{@link #trajCommand} and {@link #traj} methods should not be mixed in the same auto routine.
   * {@link #trajCommand} is used as an escape hatch for teams that don't need the benefits of the
   * {@link #traj} method and its {@link Trigger} api. {@link #trajCommand} does not invoke bindings
   * added via calling {@link #bind} or {@link ChoreoAutoBindings} passed into the factory
   * constructor.
   *
   * @param trajName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @return A new auto trajectory.
   */
  public Command trajCommand(String trajName, final int splitIndex) {
    return traj(trajName, splitIndex, VOID_LOOP).cmd();
  }

  /**
   * Creates a new auto trajectory command to be used in an auto routine.
   *
   * <p><b>Important </b>
   *
   * <p>{@link #trajCommand} and {@link #traj} methods should not be mixed in the same auto routine.
   * {@link #trajCommand} is used as an escape hatch for teams that don't need the benefits of the
   * {@link #traj} method and its {@link Trigger} api. {@link #trajCommand} does not invoke bindings
   * added via calling {@link #bind} or {@link ChoreoAutoBindings} passed into the factory
   * constructor.
   *
   * @param <SampleType> The type of the trajectory samples.
   * @param trajectory The trajectory to use.
   * @return A new auto trajectory.
   */
  public <SampleType extends TrajSample<SampleType>> Command trajCommand(
      ChorTrajectory<SampleType> trajectory) {
    return traj(trajectory, VOID_LOOP).cmd();
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
   * The {@link AutoFactory} caches trajectories with a {@link ChoreoTrajCache} to avoid reloading
   * the same trajectory multiple times. This can have the side effect of keeping a single copy of
   * every trajectory ever loaded in memory aslong as the factory is loaded. This method clears the
   * cache of all trajectories.
   *
   * <p><b>Usage Note:</b>
   *
   * <p>Never clearing the cache is unlikely to have an impact on the robots performance on a rio 2
   */
  public void clearCache() {
    trajCache.clear();
  }
}
