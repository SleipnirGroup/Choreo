// Copyright (c) Choreo contributors

package choreo.auto;

import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import java.util.function.BooleanSupplier;

/**
 * An object that represents an autonomous routine.
 *
 * <p>This loop is used to handle autonomous trigger logic and schedule commands. This loop should
 * **not** be shared across multiple autonomous routines.
 *
 * @see AutoFactory#newRoutine Creating a routine from a AutoFactory
 */
public class AutoRoutine {
  /** The underlying {@link EventLoop} that triggers are bound to and polled */
  protected final EventLoop loop;

  /** The name of the auto routine this loop is associated with */
  protected final String name;

  /** A boolean utilized in {@link #enabled()} to resolve trueness */
  protected boolean isActive = false;

  /** A boolean that is true when the loop is killed */
  protected boolean isKilled = false;

  /** The amount of times the routine has been polled */
  protected int pollCount = 0;

  /**
   * Creates a new loop with a specific name
   *
   * @param name The name of the loop
   * @see AutoFactory#newRoutine Creating a loop from a AutoFactory
   */
  public AutoRoutine(String name) {
    this.loop = new EventLoop();
    this.name = name;
  }

  /**
   * A constructor to be used when inhereting this class to instantiate a custom inner loop
   *
   * @param name The name of the loop
   * @param loop The inner {@link EventLoop}
   */
  protected AutoRoutine(String name, EventLoop loop) {
    this.loop = loop;
    this.name = name;
  }

  /**
   * Returns a {@link Trigger} that is true while this autonomous routine is being polled.
   *
   * <p>Using a {@link Trigger#onFalse(Command)} will do nothing as when this is false the routine
   * is not being polled anymore.
   *
   * @return A {@link Trigger} that is true while this autonomous routine is being polled.
   */
  public Trigger enabled() {
    return new Trigger(loop, () -> isActive && DriverStation.isAutonomousEnabled());
  }

  /** Polls the routine. Should be called in the autonomous periodic method. */
  public void poll() {
    if (!DriverStation.isAutonomousEnabled() || isKilled) {
      isActive = false;
      return;
    }
    pollCount++;
    loop.poll();
    isActive = true;
  }

  /**
   * Gets the event loop that this routine is using.
   *
   * @return The event loop that this routine is using.
   */
  public EventLoop loop() {
    return loop;
  }

  /**
   * Gets the poll count of the routine.
   * 
   * @return The poll count of the routine.
   */
  int pollCount() {
    return pollCount;
  }

  /**
   * Resets the routine. This can either be called on auto init or auto end to reset the routine
   * incase you run it again. If this is called on a routine that doesn't need to be reset it will
   * do nothing.
   */
  public void reset() {
    pollCount = 0;
    isActive = false;
  }

  /** Kills the loop and prevents it from running again. */
  public void kill() {
    CommandScheduler.getInstance().cancelAll();
    if (isKilled) {
      return;
    }
    reset();
    DriverStation.reportWarning("Killed An Auto Loop", true);
    isKilled = true;
  }

  /**
   * Creates a command that will poll this event loop and reset it when it is cancelled.
   *
   * @return A command that will poll this event loop and reset it when it is cancelled.
   * @see #cmd(BooleanSupplier) A version of this method that takes a condition to finish the loop.
   */
  public Command cmd() {
    return Commands.run(this::poll)
        .finallyDo(this::reset)
        .until(() -> !DriverStation.isAutonomousEnabled())
        .withName(name);
  }

  /**
   * Creates a command that will poll this event loop and reset it when it is finished or canceled.
   *
   * @param finishCondition A condition that will finish the loop when it is true.
   * @return A command that will poll this event loop and reset it when it is finished or canceled.
   * @see #cmd() A version of this method that doesn't take a condition and never finishes.
   */
  public Command cmd(BooleanSupplier finishCondition) {
    return Commands.run(this::poll)
        .finallyDo(this::reset)
        .until(() -> !DriverStation.isAutonomousEnabled() || finishCondition.getAsBoolean())
        .withName(name);
  }
}
