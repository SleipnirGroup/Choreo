package com.choreo.lib;

import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import edu.wpi.first.wpilibj2.command.button.Trigger;

/**
 * A loop that represents an autonomous routine. This loop is used to handle autonomous trigger
 * logic and schedule commands.
 */
public class ChoreoAutoLoop {
  /** The name of the loop */
  protected String name;

  /** The underlying {@link EventLoop} stuff is bound to and polled */
  protected final EventLoop loop;

  /** A boolean utilized in {@link #enabled()} to resolve trueness */
  protected boolean hasBeenPolled = false;

  /**
   * Creates a new loop with a specific name
   *
   * @param name Loop name
   * @see com.choreo.lib.ChoreoAutoFactory#newLoop(String) Creating a loop from a ChoreoAutoFactory
   */
  public ChoreoAutoLoop(String name) {
    this.loop = new EventLoop();
    this.name = name;
  }

  /**
   * A constructor to be used when inhereting this class to instantiate a custom inner loop
   *
   * @param name The name of the loop
   * @param loop The inner {@link EventLoop}
   */
  protected ChoreoAutoLoop(String name, EventLoop loop) {
    this.loop = loop;
    this.name = name;
  }

  /**
   * Creates a {@link Trigger} that is true while this autonomous loop is being polled.
   *
   * @return A {@link Trigger} that is true while this autonomous loop is being polled.
   */
  public Trigger enabled() {
    return new Trigger(loop, () -> hasBeenPolled).and(RobotModeTriggers.autonomous());
  }

  /** Polls the loop. Should be called in the autonomous periodic method. */
  public void poll() {
    hasBeenPolled = true;
    loop.poll();
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
   * Gets the name of the loop
   *
   * @return The name of the loop
   */
  public String getName() {
    return name;
  }

  /**
   * Sets the name of the loop
   *
   * @param name The loops new name
   */
  public void setName(String name) {
    this.name = name;
  }
}
