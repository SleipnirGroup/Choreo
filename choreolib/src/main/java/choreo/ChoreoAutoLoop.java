package choreo;

import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import java.util.function.BooleanSupplier;
import java.util.ArrayList;

/**
 * A loop that represents an autonomous routine.
 * <p>
 * This loop is used to handle autonomous trigger logic and schedule commands.
 * This loop should **not** be shared across multiple autonomous routines.
 */
public class ChoreoAutoLoop {
  protected final ArrayList<ChoreoAutoTrajectory> trajectories = new ArrayList<>();

  /** The underlying {@link EventLoop} stuff is bound to and polled */
  protected final EventLoop loop;

  /** A boolean utilized in {@link #enabled()} to resolve trueness */
  protected boolean isActive = false;

  /**
   * Creates a new loop with a specific name
   *
   * @see choreo.ChoreoAutoFactory#newLoop() Creating a loop from a ChoreoAutoFactory
   */
  public ChoreoAutoLoop() {
    this.loop = new EventLoop();
  }

  /**
   * A constructor to be used when inhereting this class to instantiate a custom inner loop
   *
   * @param loop The inner {@link EventLoop}
   */
  protected ChoreoAutoLoop(EventLoop loop) {
    this.loop = loop;
  }

  /**
   * A callback that will cleanup state of all trajectories when a new trajectory is started.
   */
  void onNewTrajectory() {
    for (ChoreoAutoTrajectory traj : trajectories) {
      traj.onNewTrajectory();
    }
  }

  /**
   * Returns a {@link Trigger} that is true while this autonomous loop is being polled.
   * 
   * Using a {@link Trigger#onFalse(Command)} will do nothing as when this is false the 
   * loop is not being polled anymore.
   *
   * @return A {@link Trigger} that is true while this autonomous loop is being polled.
   */
  public Trigger enabled() {
    return new Trigger(loop, () -> isActive).and(DriverStation::isAutonomousEnabled);
  }

  /** Polls the loop. Should be called in the autonomous periodic method. */
  public void poll() {
    if (!DriverStation.isAutonomousEnabled()) {
      isActive = false;
      return;
    }
    loop.poll();
    isActive = true;
  }

  /**
   * Gets the event loop that this loop is using.
   *
   * @return The event loop that this loop is using.
   */
  public EventLoop getLoop() {
    return loop;
  }

  /**
   * Adds a trajectory to the loop. This is used to ensure that all trajectories are reset when a
   * new trajectory is started.
   *
   * @param traj The trajectory to add to the loop.
   */
  void addTrajectory(ChoreoAutoTrajectory traj) {
    trajectories.add(traj);
  }

  /**
   * Resets the loop. This can either be called on auto init or auto end to reset the loop incase
   * you run it again. If this is called on a loop that doesn't need to be reset it will do nothing.
   */
  public void reset() {
    isActive = false;
    onNewTrajectory();
  }

  /**
   * Creates a command that will poll this event loop and reset it when it is cancelled.
   *
   * @return A command that will poll this event loop and reset it when it is cancelled.
   * @see #cmd(BooleanSupplier) A version of this method that takes a condition to finish the loop.
   */
  public Command cmd() {
    return Commands.run(this::poll).finallyDo(this::reset)
      .until(() -> !DriverStation.isAutonomousEnabled())
      .withName("ChoreoAutoLoop");
  }

  /**
   * Creates a command that will poll this event loop and reset it when it is finished or canceled.
   *
   * @param finishCondition A condition that will finish the loop when it is true.
   * @return A command that will poll this event loop and reset it when it is finished or canceled.
   * @see #cmd() A version of this method that doesn't take a condition and never finishes.
   */
  public Command cmd(BooleanSupplier finishCondition) {
    return this.cmd()
      .until(() -> finishCondition.getAsBoolean())
      .withName("ChoreoAutoLoop");
  }
}
