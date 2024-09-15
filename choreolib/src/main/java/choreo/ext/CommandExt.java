// Copyright (c) Choreo contributors

package choreo.ext;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import java.util.function.BooleanSupplier;

public class CommandExt extends Command {
  private final Command command;

  public CommandExt(Command command) {
    this.command = command;
  }

  public Command after(BooleanSupplier condition) {
    return Commands.sequence(Commands.waitUntil(condition), command);
  }

  public Command afterSeconds(double seconds) {
    return Commands.sequence(Commands.waitSeconds(seconds), command);
  }
}
