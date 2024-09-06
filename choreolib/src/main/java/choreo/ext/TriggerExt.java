// Copyright (c) Choreo contributors

package choreo.ext;

import edu.wpi.first.wpilibj.event.EventLoop;
import edu.wpi.first.wpilibj2.command.Command;
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
   * On true it will evaluate the andCondition and run the andTrueCmd if true, and the andFalseCmd
   * if false.
   *
   * @param andCondition The condition to evaluate
   * @param andTrueCmd The command to run if the andCondition is true
   * @param andFalseCmd The command to run if the andCondition is false
   * @return This trigger
   */
  public TriggerExt onTrueWith(
      BooleanSupplier andCondition, Command andTrueCmd, Command andFalseCmd) {
    this.and(andCondition).onTrue(andTrueCmd);
    this.and(() -> !andCondition.getAsBoolean()).onTrue(andFalseCmd);
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
