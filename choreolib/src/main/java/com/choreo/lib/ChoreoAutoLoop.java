package com.choreo.lib;

import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import edu.wpi.first.wpilibj2.command.button.Trigger;

/**
 * A loop that represents an autonomous routine. This loop is used to handle autonomous trigger
 * logic and schedule commands.
 */
public class ChoreoAutoLoop {
  protected final EventLoop loop;
  protected boolean hasBeenPolled = false;

  protected ChoreoAutoLoop() {
    this.loop = new EventLoop();
  }

  protected ChoreoAutoLoop(ChoreoAutoLoop template) {
    this.loop = template.getLoop();
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
  protected EventLoop getLoop() {
    return loop;
  }
}
