// Copyright (c) Choreo contributors

package choreo.auto;

import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import java.util.function.BooleanSupplier;

import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectorySample;

/**
 * An object that represents an autonomous routine.
 *
 * <p>This loop is used to handle autonomous trigger logic and schedule commands. This loop should
 * **not** be shared across multiple autonomous routines.
 *
 * @see AutoFactory#newRoutine Creating a routine from a AutoFactory
 */
public class AutoRoutine {
  /**
   * The factory that created this loop. This is used to create commands that are associated with
   * this loop.
   */
  protected final AutoFactory factory;

  /** The underlying {@link EventLoop} that triggers are bound to and polled */
  protected final EventLoop loop;

  /** The name of the auto routine this loop is associated with */
  protected final String name;

  /** A boolean utilized in {@link #running()} to resolve trueness */
  protected boolean isActive = false;

  /** A boolean that is true when the loop is killed */
  protected boolean isKilled = false;

  /** The amount of times the routine has been polled */
  protected int pollCount = 0;

  /** Returns true if the alliance is known or is irrelevant (i.e. flipping is not being done) */
  protected BooleanSupplier allianceKnownOrIgnored = () -> true;

  /**
   * A constructor to be used when inhereting this class to instantiate a custom inner loop
   *
   * @param name The name of the loop
   * @param loop The inner {@link EventLoop}
   */
  protected AutoRoutine(AutoFactory factory, String name, EventLoop loop) {
    this.factory = factory;
    this.loop = loop;
    this.name = name;
  }

  /**
   * Creates a new loop with a specific name
   *
   * @param factory The factory that created this loop
   * @param name The name of the loop
   * @see AutoFactory#newRoutine Creating a loop from a AutoFactory
   */
  protected AutoRoutine(AutoFactory factory, String name) {
    this(factory, name, new EventLoop());
  }

  /**
   * Creates a new loop with a specific name and a custom alliance supplier.
   *
   * @param name The name of the loop
   * @param allianceKnownOrIgnored Returns true if the alliance is known or is irrelevant (i.e.
   *     flipping is not being done).
   * @see AutoFactory#newRoutine Creating a loop from a AutoFactory
   */
  protected AutoRoutine(AutoFactory factory, String name, BooleanSupplier allianceKnownOrIgnored) {
    this(factory, name);
    this.allianceKnownOrIgnored = allianceKnownOrIgnored;
  }

  /**
   * Returns a {@link Trigger} that is true while this autonomous routine is being polled.
   *
   * <p>Using a {@link Trigger#onFalse(Command)} will do nothing as when this is false the routine
   * is not being polled anymore.
   *
   * @return A {@link Trigger} that is true while this autonomous routine is being polled.
   */
  public Trigger running() {
    return new Trigger(loop, () -> isActive && DriverStation.isAutonomousEnabled());
  }

  /** Polls the routine. Should be called in the autonomous periodic method. */
  public void poll() {
    if (!DriverStation.isAutonomousEnabled()
        || !allianceKnownOrIgnored.getAsBoolean()
        || isKilled) {
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
   * Creates a new {@link AutoTrajectory} to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public AutoTrajectory trajectory(String trajectoryName) {
    return factory.trajectory(trajectoryName, this);
  }

  /**
   * Creates a new {@link AutoTrajectory} to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public AutoTrajectory trajectory(String trajectoryName, final int splitIndex) {
    return factory.trajectory(trajectoryName, splitIndex, this);
  }

  /**
   * Creates a new {@link AutoTrajectory} to be used in an auto routine.
   *
   * @param <SampleType> The type of the trajectory samples.
   * @param trajectory The trajectory to use.
   * @return A new {@link AutoTrajectory}.
   */
  public <SampleType extends TrajectorySample<SampleType>> AutoTrajectory trajectory(Trajectory<SampleType> trajectory) {
    return factory.trajectory(trajectory, this);
  }

  /**
   * Creates a command that will poll this event loop and reset it when it is cancelled.
   *
   * <p>The command will end instantly and kill the routine if the alliance supplier returns an
   * empty optional when the command is scheduled.
   *
   * @return A command that will poll this event loop and reset it when it is cancelled.
   * @see #cmd(BooleanSupplier) A version of this method that takes a condition to finish the loop.
   */
  public Command cmd() {
    return cmd(() -> false);
  }

  /**
   * Creates a command that will poll this event loop and reset it when it is finished or canceled.
   *
   * <p>The command will end instantly and kill the routine if the alliance supplier returns an
   * empty optional when the command is scheduled.
   *
   * @param finishCondition A condition that will finish the loop when it is true.
   * @return A command that will poll this event loop and reset it when it is finished or canceled.
   * @see #cmd() A version of this method that doesn't take a condition and never finishes except if
   *     the alliance supplier returns an empty optional when scheduled.
   */
  public Command cmd(BooleanSupplier finishCondition) {
    return Commands.either(
        Commands.run(this::poll)
            .finallyDo(this::reset)
            .until(() -> !DriverStation.isAutonomousEnabled() || finishCondition.getAsBoolean())
            .withName(name),
        Commands.runOnce(
            () -> {
              DriverStation.reportWarning(
                  "[Choreo] Alliance not known when starting routine", false);
              kill();
            }),
        allianceKnownOrIgnored);
  }
}
