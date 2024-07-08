package frc.robot;

import java.util.function.Function;

import com.choreo.lib.ChoreoAutoFactory;

import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.smartdashboard.SendableChooser;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;

public class ChoreoAutoChooser {
  public static interface AutoRoutineGenerator extends Function<ChoreoAutoFactory, Command> {
  }

  private final SendableChooser<AutoRoutineGenerator> choreoAutoChooser = new SendableChooser<>();

  private Command lastAutoRoutine = null;

  public ChoreoAutoChooser(ChoreoAutoFactory factory) {
    lastAutoRoutine = Commands.none().withName("Do Nothing Auto");
    choreoAutoChooser.setDefaultOption("Do Nothing", arg -> Commands.none().withName("Do Nothing Auto"));
    choreoAutoChooser.onChange(
        generator -> {
          if (DriverStation.isDisabled()) {
            lastAutoRoutine = generator.apply(factory);
          }
        });
    SmartDashboard.putData(choreoAutoChooser);
  }

  public void addAutoRoutine(String name, AutoRoutineGenerator generator) {
    choreoAutoChooser.addOption(name, generator);
  }

  public Command getSelectedAutoRoutine() {
    return lastAutoRoutine;
  }
}
