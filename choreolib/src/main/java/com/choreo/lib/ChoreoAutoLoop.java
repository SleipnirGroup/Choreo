package com.choreo.lib;

import java.util.function.BooleanSupplier;

import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.button.Trigger;

/**
 * A loop that represents an autonomous period.
 * This loop is used to handle autonomous trigger logic and schedule commands.
 */
public class ChoreoAutoLoop {
    private final EventLoop loop = new EventLoop();
    private boolean hasBeenPolled = false;

    ChoreoAutoLoop() {}

    /**
     * Creates a {@link Trigger} that is always true.
     * 
     * @return A {@link Trigger} that is always true.
     */
    public Trigger autoEnabled() {
        return new Trigger(loop, () -> hasBeenPolled);
    }

    /**
     * Polls the loop. Should be called in the autonomous periodic method.
     */
    public void poll() {
        hasBeenPolled = true;
        loop.poll();
    }

    /**
     * Will take a trigger or boolean supplier and return a trigger that is only polled by this loop.
     * 
     * @param trigger The trigger to be polled by this loop.
     * @return A trigger that is only polled by this loop.
     */
    public Trigger autoOnlyTrigger(BooleanSupplier trigger) {
        return new Trigger(loop, trigger);
    }

    EventLoop getLoop() {
        return loop;
    }
}
