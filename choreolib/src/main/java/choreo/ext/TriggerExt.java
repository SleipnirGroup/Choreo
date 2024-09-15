// Copyright (c) Choreo contributors

package choreo.ext;

import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.VarHandle;
import java.util.function.BooleanSupplier;

public class TriggerExt extends Trigger {
  private static final VarHandle loopHandle;

  static {
    try {
      loopHandle =
          MethodHandles.privateLookupIn(Trigger.class, MethodHandles.lookup())
              .findVarHandle(Trigger.class, "m_loop", EventLoop.class);
    } catch (NoSuchFieldException | IllegalAccessException e) {
      throw new RuntimeException(e);
    }
  }

  public TriggerExt(EventLoop loop, BooleanSupplier condition) {
    super(loop, condition);
  }

  public static TriggerExt done(Command cmd, EventLoop loop) {
    BooleanSupplier isDone =
        new BooleanSupplier() {
          boolean wasJustScheduled = false;

          @Override
          public boolean getAsBoolean() {
            if (cmd.isScheduled()) {
              wasJustScheduled = true;
            } else if (wasJustScheduled) {
              wasJustScheduled = false;
              return true;
            }
            return false;
          }
        };
    return new TriggerExt(loop, isDone);
  }

  public static TriggerExt running(Command cmd, EventLoop loop) {
    return new TriggerExt(loop, cmd::isScheduled);
  }

  /**
   * Sets up a {@link Command} to mimic a default command while a condition is true.
   * 
   * <p>
   * The command will not interrupt any command other than the original default command of the
   * subsystems the command requires.
   *
   * @param command the command to start
   * @return this trigger, so calls can be chained
   */
  public TriggerExt whileTrueDefault(Command cmd) {
    // you could implement this by overiding the subsystems default command
    // but that has alot of foot guns and likely would leak into causing issues
    var cond = this;
    ((EventLoop) loopHandle.get(this)).bind(
        new Runnable() {
          private final CommandScheduler scheduler = CommandScheduler.getInstance();
          private boolean pressedLast = cond.getAsBoolean();

          public boolean freeToScehdule(Command cmd) {
            var requirements = cmd.getRequirements();
            for (var requirement : requirements) {
              // todo test this logic better for null cases
              if (scheduler.requiring(requirement) != requirement.getDefaultCommand()) {
                return false;
              }
            }
            return true;
          }

          @Override
          public void run() {
            boolean pressed = cond.getAsBoolean();

            if (!pressedLast && pressed) {
              if (!cmd.isScheduled() && freeToScehdule(cmd)) {
                cmd.schedule();
              }
            } else if (pressedLast && !pressed) {
              cmd.cancel();
            }

            pressedLast = pressed;
          }
        });
    return this;
  }

  public static TriggerExt from(Trigger trigger) {
    if (trigger instanceof TriggerExt) {
      return (TriggerExt) trigger;
    } else {
      return new TriggerExt((EventLoop) loopHandle.get(trigger), trigger);
    }
  }
}