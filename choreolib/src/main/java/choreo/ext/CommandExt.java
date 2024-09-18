// Copyright (c) Choreo contributors

package choreo.ext;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import java.util.function.BooleanSupplier;

/** A Command extension to test new features to be upstreamed */
public class CommandExt extends Command {
  private final Command command;

  /**
   * Creates a new CommandExt with a command.
   *
   * @param command The command to run
   */
  public CommandExt(Command command) {
    this.command = command;
  }

  /**
   * Runs the command after a condition is met.
   *
   * @param condition The condition to run the command after
   * @return A new Command that runs the command after the condition is met
   */
  public Command after(BooleanSupplier condition) {
    return command.beforeStarting(Commands.waitUntil(condition));
  }

  /**
   * Runs the command after a certain amount of time.
   *
   * @param seconds The amount of time to wait before running the command
   * @return A new Command that runs the command after the specified amount of time
   */
  public Command afterSeconds(double seconds) {
    return command.beforeStarting(Commands.waitSeconds(seconds));
  }
}
