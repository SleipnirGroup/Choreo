// Copyright (c) Choreo contributors

package choreo;

import choreo.Choreo.ChoreoControlFunction;
import choreo.Choreo.ChoreoTrajectoryLogger;
import choreo.trajectory.ChoreoTrajectory;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.TrajSample;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
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
 *   // create a new auto loop to return
 *   var loop = factory.newLoop();
 *
 *   // create a trajectory that moves the robot 2 meters
 *   ChoreoAutoTrajectory traj = factory.traj("move2meters", loop);
 *
 *   return shooter.shoot()
 *      .andThen(traj.cmd())
 *      .withName("ShootThenMove");
 * }
 * </code></pre>
 */
public class ChoreoAutoFactory {
  /**
   * An Auto Loop that cannot have any side-effects,
   * it stores no state and does nothing when polled.
   */
  public static final ChoreoAutoLoop VOID_LOOP = new ChoreoAutoLoop() {
    @Override
    public Command cmd() { return Commands.none(); }
    @Override
    public Command cmd(BooleanSupplier finishCondition) {
      return Commands.none();
    }
    @Override
    void addTrajectory(ChoreoAutoTrajectory traj) {}
    @Override
    void onNewTrajectory() {}
    @Override
    public void poll() {}
    @Override
    public void reset() {}
    @Override
    public Trigger enabled() { return new Trigger(() -> false); }
  };

  public static final class TrajectoryNotFoundException extends RuntimeException {
    private final String trajName;
    public TrajectoryNotFoundException(String trajName) {
      super("Could not find trajectory: " + trajName);
      this.trajName = trajName;
    }
    public String getTrajName() {
      return trajName;
    }
  }

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

  private final Supplier<Pose2d> poseSupplier;
  private final ChoreoControlFunction<? extends TrajSample<?>> controller;
  private final Consumer<ChassisSpeeds> outputChassisSpeeds;
  private final BooleanSupplier mirrorTrajectory;
  private final Subsystem driveSubsystem;
  private final ChoreoAutoBindings bindings = new ChoreoAutoBindings();
  private final Optional<ChoreoTrajectoryLogger> trajLogger;

  ChoreoAutoFactory(
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction<? extends TrajSample<?>> controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      Subsystem driveSubsystem,
      ChoreoAutoBindings bindings,
      Optional<ChoreoTrajectoryLogger> trajLogger) {
    this.poseSupplier = poseSupplier;
    this.controller = controller;
    this.outputChassisSpeeds = outputChassisSpeeds;
    this.mirrorTrajectory = mirrorTrajectory;
    this.driveSubsystem = driveSubsystem;
    this.bindings.merge(bindings);
    this.trajLogger = trajLogger;
  }

  /**
   * Creates a new auto loop to be used to make an auto routine.
   *
   * @return A new auto loop.
   */
  public ChoreoAutoLoop newLoop() {
    return new ChoreoAutoLoop();
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajName The name of the trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public ChoreoAutoTrajectory traj(String trajName, ChoreoAutoLoop loop) {
    Optional<? extends ChoreoTrajectory<?>> optTraj = Choreo.loadTrajectory(trajName);
    ChoreoTrajectory<?> traj;
    if (optTraj.isPresent()) {
      traj = optTraj.get();
    } else {
      DriverStation.reportError("Could not load trajectory: " + trajName, false);
      traj = new ChoreoTrajectory<SwerveSample>(trajName, List.of(), List.of(), List.of());
    }
    var autoTraj =
        new ChoreoAutoTrajectory(
            trajName,
            traj,
            poseSupplier,
            controller,
            outputChassisSpeeds,
            mirrorTrajectory,
            trajLogger,
            driveSubsystem,
            loop.getLoop(),
            bindings,
            loop::onNewTrajectory);
    loop.addTrajectory(autoTraj);
    return autoTraj;
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public ChoreoAutoTrajectory traj(String trajName, final int splitIndex, ChoreoAutoLoop loop) {
    Optional<? extends ChoreoTrajectory<?>> optTraj =
        Choreo.loadTrajectory(trajName).flatMap(traj -> traj.getSplit(splitIndex));
    ChoreoTrajectory<?> traj;
    if (optTraj.isPresent()) {
      traj = optTraj.get();
    } else {
      DriverStation.reportError("Could not load trajectory: " + trajName, false);
      traj = new ChoreoTrajectory<SwerveSample>(trajName, List.of(), List.of(), List.of());
    }
    return traj(traj, loop);
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajectory The trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public <SampleType extends TrajSample<SampleType>> ChoreoAutoTrajectory traj(
      ChoreoTrajectory<SampleType> trajectory, ChoreoAutoLoop loop) {
    var traj =
        new ChoreoAutoTrajectory(
            trajectory.name(),
            trajectory,
            poseSupplier,
            controller,
            outputChassisSpeeds,
            mirrorTrajectory,
            trajLogger,
            driveSubsystem,
            loop.getLoop(),
            bindings,
            loop::onNewTrajectory);
    loop.addTrajectory(traj);
    return traj;
  }

  /**
   * Creates a new auto trajectory command to be used in an auto routine.
   * 
   * <p>
   * <h1> Important </h1>
   * <p>
   * {@link #trajCommand} and {@link #traj} methods should not be mixed in the same auto routine.
   * {@link #trajCommand} is used as an escape hatch for teams that don't need the benefits of the {@link #traj} method
   * and its {@link Trigger} api. {@link #trajCommand} does not invoke bindings added via calling {@link #bind}
   * or {@link ChoreoAutoBindings} passed into the factory constructor.
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
   * <p>
   * <h1> Important </h1>
   * <p>
   * {@link #trajCommand} and {@link #traj} methods should not be mixed in the same auto routine.
   * {@link #trajCommand} is used as an escape hatch for teams that don't need the benefits of the {@link #traj} method
   * and its {@link Trigger} api. {@link #trajCommand} does not invoke bindings added via calling {@link #bind}
   * or {@link ChoreoAutoBindings} passed into the factory constructor.
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
   * <p>
   * <h1> Important </h1>
   * <p>
   * {@link #trajCommand} and {@link #traj} methods should not be mixed in the same auto routine.
   * {@link #trajCommand} is used as an escape hatch for teams that don't need the benefits of the {@link #traj} method
   * and its {@link Trigger} api. {@link #trajCommand} does not invoke bindings added via calling {@link #bind}
   * or {@link ChoreoAutoBindings} passed into the factory constructor.
   *
   * @param trajectory The trajectory to use.
   * @return A new auto trajectory.
   */
  public <SampleType extends TrajSample<SampleType>> Command trajCommand(
      ChoreoTrajectory<SampleType> trajectory) {
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
}
