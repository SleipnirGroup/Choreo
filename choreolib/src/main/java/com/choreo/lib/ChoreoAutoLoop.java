package com.choreo.lib;

import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import java.util.function.BooleanSupplier;

/**
 * A loop that represents an autonomous routine. This loop is used to handle autonomous trigger
 * logic and schedule commands.
 */
public class ChoreoAutoLoop {
  /** The underlying {@link EventLoop} stuff is bound to and polled */
  protected final EventLoop loop;

  /** A boolean utilized in {@link #enabled()} to resolve trueness */
  protected boolean isActive = false;

  /**
   * Creates a new loop with a specific name
   *
   * @see com.choreo.lib.ChoreoAutoFactory#newLoop() Creating a loop from a ChoreoAutoFactory
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
   * Creates a {@link Trigger} that is true while this autonomous loop is being polled.
   *
   * @return A {@link Trigger} that is true while this autonomous loop is being polled.
   */
  public Trigger enabled() {
    // TODO: Maybe add a warning if this is called while `hasBeenPolled` is already true
    return new Trigger(loop, () -> isActive).and(RobotModeTriggers.autonomous());
  }

  /** Polls the loop. Should be called in the autonomous periodic method. */
  public void poll() {
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
   * Resets the loop. This can either be called on auto init or auto end to reset the loop incase
   * you run it again. If this is called on a loop that doesn't need to be reset it will do nothing.
   */
  public void reset() {
    isActive = false;
  }

  /**
   * Creates a command that will poll this event loop and reset it when it is cancelled.
   *
   * @return A command that will poll this event loop and reset it when it is cancelled.
   * @see #cmd(BooleanSupplier) A version of this method that takes a condition to finish the loop.
   */
  public Command cmd() {
    return Commands.run(this::poll).finallyDo(this::reset);
  }

  /**
   * Creates a command that will poll this event loop and reset it when it is finished or canceled.
   *
   * @param finishCondition A condition that will finish the loop when it is true.
   * @return A command that will poll this event loop and reset it when it is finished or canceled.
   * @see #cmd() A version of this method that doesn't take a condition and never finishes.
   */
  public Command cmd(BooleanSupplier finishCondition) {
    return this.cmd().until(finishCondition);
  }
}
