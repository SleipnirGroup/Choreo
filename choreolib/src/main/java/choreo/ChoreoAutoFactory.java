package choreo;

import choreo.Choreo.ChoreoControlFunction;
import choreo.trajectory.ChoreoTrajectory;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Subsystem;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.function.BiConsumer;
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
  private final ChoreoControlFunction controller;
  private final Consumer<ChassisSpeeds> outputChassisSpeeds;
  private final BooleanSupplier mirrorTrajectory;
  private final Subsystem driveSubsystem;
  private final ChoreoAutoBindings bindings = new ChoreoAutoBindings();
  private final Optional<BiConsumer<ChoreoTrajectory, Boolean>> trajLogger;

  ChoreoAutoFactory(
      Supplier<Pose2d> poseSupplier,
      ChoreoControlFunction controller,
      Consumer<ChassisSpeeds> outputChassisSpeeds,
      BooleanSupplier mirrorTrajectory,
      Subsystem driveSubsystem,
      ChoreoAutoBindings bindings,
      Optional<BiConsumer<ChoreoTrajectory, Boolean>> trajLogger) {
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
    var traj = new ChoreoAutoTrajectory(
        trajName,
        Choreo.getTrajectory(trajName)
            .orElseGet(
                () -> {
                  DriverStation.reportError("Could not load trajectory: " + trajName, false);
                  return new ChoreoTrajectory();
                }),
        poseSupplier,
        controller,
        outputChassisSpeeds,
        mirrorTrajectory,
        trajLogger,
        driveSubsystem,
        loop.getLoop(),
        bindings,
        loop::onNewTrajectory
    );
    loop.addTrajectory(traj);
    return traj;
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajectory The trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public ChoreoAutoTrajectory traj(ChoreoTrajectory trajectory, ChoreoAutoLoop loop) {
    var traj = new ChoreoAutoTrajectory(
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
        loop::onNewTrajectory
    );
    loop.addTrajectory(traj);
    return traj;
  }

  /**
   * Creates a new auto trajectory based on a trajectory group.
   *
   * @param trajName The name of the trajectory group to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public ChoreoAutoTrajectory trajGroup(String trajName, ChoreoAutoLoop loop) {
    var traj =  new ChoreoAutoTrajectory(
        trajName,
        Choreo.getTrajectoryGroup(trajName)
            .orElseGet(
                () -> {
                  DriverStation.reportError("Could not load trajectory group: " + trajName, false);
                  return List.of();
                }),
        poseSupplier,
        controller,
        outputChassisSpeeds,
        mirrorTrajectory,
        trajLogger,
        driveSubsystem,
        loop.getLoop(),
        bindings,
        loop::onNewTrajectory
    );
    loop.addTrajectory(traj);
    return traj;
  }

  /**
   * Creates a new auto trajectory based on a trajectory group.
   *
   * @param trajectories The list of trajectories to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  public ChoreoAutoTrajectory trajGroup(String name, List<ChoreoTrajectory> trajectories, ChoreoAutoLoop loop) {
    var traj =  new ChoreoAutoTrajectory(
        name,
        trajectories,
        poseSupplier,
        controller,
        outputChassisSpeeds,
        mirrorTrajectory,
        trajLogger,
        driveSubsystem,
        loop.getLoop(),
        bindings,
        loop::onNewTrajectory
    );
    loop.addTrajectory(traj);
    return traj;
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
