// Copyright (c) Choreo contributors

package choreo.commands3;

import static org.wpilib.util.Alert.Level.MEDIUM;

import choreo.commands3.AutoFactory.AllianceContext;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;
import choreo.util.ChoreoAlert;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BooleanSupplier;
import org.wpilib.command3.Trigger;
import org.wpilib.driverstation.RobotState;
import org.wpilib.framework.OpModeRobot;
import org.wpilib.opmode.OpMode;

/**
 * An autonomous routine, which is an {@link OpMode}.
 *
 * <p>Instead of picking a routine from a chooser, register each routine as an autonomous opmode
 * with {@link AutoFactory#addRoutine(OpModeRobot, String, java.util.function.Consumer)} and select
 * it on the Driver Station:
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
 * <p>To use the {@code @Autonomous} annotation's description and colors, or to keep a routine in
 * its own file, subclass instead. {@code OpModeRobot} constructs the class with the robot as its
 * argument when the opmode is selected:
 *
 * <pre><code>
 * &#64;Autonomous(name = "Two Piece", group = "Choreo")
 * public class TwoPiece extends AutoRoutine {
 *   public TwoPiece(Robot robot) {
 *     super(robot.autoFactory, "Two Piece");
 *     var first = trajectory("first");
 *     var second = trajectory("second");
 *     active().onTrue(first.resetOdometry().andThen(first.cmd()).withAutomaticName());
 *     first.chain(second);
 *   }
 * }
 * </code></pre>
 *
 * <p>The routine is built each time its opmode is selected, never ahead of time. Commands v3 scopes
 * the triggers and commands created while an opmode is selected to that opmode, so a routine needs
 * no polling or killing of its own. Everything it bound goes away when the opmode ends. As a
 * safeguard, the routine's own triggers ({@link #active()}, {@link #idle()}, {@link
 * #observe(BooleanSupplier)} and everything on {@link AutoTrajectory}) are also gated on the
 * routine running.
 *
 * @see AutoFactory#addRoutine Registering a routine with an AutoFactory
 */
public class AutoRoutine implements OpMode {
  /** The factory that created this routine. Used to create trajectories for this routine. */
  private final AutoFactory factory;

  /** The name of this routine. */
  private final String name;

  /** The alliance helper that is used to determine flipping logic. */
  final AllianceContext allianceCtx;

  /** True from {@link #start()} until {@link #end()}. */
  private boolean started = false;

  /** The number of trajectories created by this routine that are currently running. */
  private int runningTrajectories = 0;

  private final Trigger activeTrigger = new Trigger(this::isActive);
  private final Trigger idleTrigger = activeTrigger.and(() -> runningTrajectories == 0);

  /** The trajectories created by this routine, so their state can be reset when it starts. */
  private final List<AutoTrajectory> trajectories = new ArrayList<>();

  /**
   * Creates a new routine with a specific name.
   *
   * <p>Subclasses call this to define a routine as its own opmode class. Create the triggers and
   * bindings in the subclass constructor, and register the class with {@link
   * org.wpilib.opmode.Autonomous @Autonomous} or {@code OpModeRobot.addOpMode}. The framework then
   * constructs it when the opmode is selected, which scopes what the constructor creates. Don't
   * construct a subclass yourself ahead of time, such as in the robot constructor, as it would not
   * be scoped.
   *
   * @param factory The factory used to create this routine's trajectories
   * @param name The name of the routine
   * @see AutoFactory#addRoutine Registering a routine without writing a subclass
   */
  protected AutoRoutine(AutoFactory factory, String name) {
    this.factory = factory;
    this.name = name;
    this.allianceCtx = factory.allianceCtx;
  }

  /**
   * Gets the name of this routine.
   *
   * @return The name of this routine.
   */
  public String name() {
    return name;
  }

  /**
   * Whether the routine is currently running. Overridable for the factory's internal routine.
   *
   * @return True if the opmode has started and the robot is enabled.
   */
  boolean isActive() {
    return started && RobotState.isEnabled();
  }

  /**
   * Returns a {@link Trigger} that is true while this routine is running, that is, from when its
   * opmode starts until it ends or the robot is disabled.
   *
   * <p>This is the usual way to start the first command of a routine, such as {@code
   * routine.active().onTrue(...)}.
   *
   * @return A {@link Trigger} that is true while this routine is running.
   */
  public Trigger active() {
    return activeTrigger;
  }

  /**
   * Creates a {@link Trigger} from a condition that is only true while this routine is running.
   *
   * @param condition The condition represented by the trigger.
   * @return A {@link Trigger} that mirrors the state of the provided {@code condition} while the
   *     routine is {@link #active() active}, and is false otherwise.
   */
  public Trigger observe(BooleanSupplier condition) {
    return new Trigger(condition).and(activeTrigger);
  }

  /**
   * Creates a trigger that is true when the routine is idle.
   *
   * <p>Idle is defined as the routine running with no trajectories made by it running.
   *
   * @return A trigger that is true when the routine is idle.
   */
  public Trigger idle() {
    return idleTrigger;
  }

  /** Registers a trajectory created for this routine. */
  void register(AutoTrajectory trajectory) {
    trajectories.add(trajectory);
  }

  /** Called by this routine's trajectories when they start running. */
  void trajectoryStarted() {
    runningTrajectories++;
  }

  /** Called by this routine's trajectories when they stop running. */
  void trajectoryEnded() {
    runningTrajectories = Math.max(0, runningTrajectories - 1);
  }

  /**
   * Starts the routine. Called by the framework when the opmode is started.
   *
   * <p>If the alliance is required for flipping and is not yet known, the routine does not start.
   */
  @Override
  public void start() {
    if (!allianceCtx.allianceKnownOrIgnored()) {
      ChoreoAlert.alert("Alliance not known when starting routine", MEDIUM).set(true);
      return;
    }
    // Clear state left over from a previous run in case this routine object was reused
    runningTrajectories = 0;
    trajectories.forEach(AutoTrajectory::reset);
    started = true;
  }

  /**
   * Ends the routine. Called by the framework when the opmode ends.
   *
   * <p>Trajectory commands notice the routine is no longer active and finish on their own.
   */
  @Override
  public void end() {
    started = false;
  }

  /**
   * Creates a new {@link AutoTrajectory} to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public AutoTrajectory trajectory(String trajectoryName) {
    return factory.trajectory(trajectoryName, this, true);
  }

  /**
   * Creates a new {@link AutoTrajectory} to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public AutoTrajectory trajectory(String trajectoryName, final int splitIndex) {
    return factory.trajectory(trajectoryName, splitIndex, this, true);
  }

  /**
   * Creates a new {@link AutoTrajectory} to be used in an auto routine.
   *
   * @param <SampleType> The type of the trajectory samples.
   * @param trajectory The trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public <SampleType extends TrajectorySample<SampleType>> AutoTrajectory trajectory(
      Trajectory<SampleType> trajectory) {
    return factory.trajectory(trajectory, this, true);
  }

  /**
   * Creates a trigger that produces a rising edge when any of the trajectories are finished.
   *
   * @param trajectory The first trajectory to watch.
   * @param trajectories The other trajectories to watch
   * @return a trigger that determines if any of the trajectories are finished
   * @see #anyDoneDelayed(double, AutoTrajectory, AutoTrajectory...) A version of this method that
   *     takes a delay in seconds before the trigger is true.
   */
  public Trigger anyDone(AutoTrajectory trajectory, AutoTrajectory... trajectories) {
    return anyDoneDelayed(0, trajectory, trajectories);
  }

  /**
   * Creates a trigger that produces a rising edge when any of the trajectories are finished.
   *
   * @param secondsToDelay The delay after completion, in seconds.
   * @param trajectory The first trajectory to watch.
   * @param trajectories The other trajectories to watch
   * @return a trigger that goes true for one cycle whenever any of the trajectories finishes,
   *     delayed by the given number of seconds.
   * @see AutoTrajectory#doneDelayed(double)
   */
  public Trigger anyDoneDelayed(
      double secondsToDelay, AutoTrajectory trajectory, AutoTrajectory... trajectories) {
    var trigger = trajectory.doneDelayed(secondsToDelay);
    for (int i = 0; i < trajectories.length; i++) {
      trigger = trigger.or(trajectories[i].doneDelayed(secondsToDelay));
    }
    return trigger.and(this.active());
  }

  /**
   * Creates a trigger that returns true when any of the trajectories given are active.
   *
   * @param trajectory The first trajectory to watch.
   * @param trajectories The other trajectories to watch
   * @return a trigger that determines if any of the trajectories are active
   */
  public Trigger anyActive(AutoTrajectory trajectory, AutoTrajectory... trajectories) {
    var trigger = trajectory.active();
    for (int i = 0; i < trajectories.length; i++) {
      trigger = trigger.or(trajectories[i].active());
    }
    return trigger.and(this.active());
  }

  /**
   * Creates a trigger that returns true when all of the trajectories given are inactive.
   *
   * <p>This trigger will only return true if the routine is active.
   *
   * @param trajectory The first trajectory to watch.
   * @param trajectories The other trajectories to watch
   * @return a trigger that determines if all of the trajectories are inactive
   */
  public Trigger allInactive(AutoTrajectory trajectory, AutoTrajectory... trajectories) {
    var trigger = trajectory.inactive();
    for (int i = 0; i < trajectories.length; i++) {
      trigger = trigger.and(trajectories[i].inactive());
    }
    return trigger.and(this.active());
  }
}
