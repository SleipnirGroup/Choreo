// Copyright (c) Choreo contributors

package choreo.auto;

import org.wpilib.command2.Command;
import org.wpilib.command2.CommandScheduler;
import org.wpilib.command2.Commands;
import org.wpilib.opmode.OpMode;

/** An OpMode that runs a routine selected from an AutoChooser. */
public class AutoChooserOpMode implements OpMode {
  private final AutoChooser autoChooser;
  private Command autonomousCommand = Commands.none();

  /**
   * Creates a new AutoChooserOpMode.
   *
   * @param autoChooser the AutoChooser to use for selecting the autonomous routine to run.
   */
  public AutoChooserOpMode(AutoChooser autoChooser) {
    this.autoChooser = autoChooser;
  }

  @Override
  public void start() {
    autonomousCommand = autoChooser.selectedCommand();

    if (autonomousCommand != null) {
      CommandScheduler.getInstance().schedule(autonomousCommand);
    }
  }

  @Override
  public void end() {
    if (autonomousCommand != null) {
      autonomousCommand.cancel();
    }
  }
}
