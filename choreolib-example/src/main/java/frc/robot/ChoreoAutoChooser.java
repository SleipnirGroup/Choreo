package frc.robot;

import java.util.function.Function;

import com.choreo.lib.ChoreoAutoFactory;
import com.choreo.lib.ChoreoAutoLoop;

import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.smartdashboard.SendableChooser;

public class ChoreoAutoChooser {
    public static interface AutoRoutineGenerator extends Function<ChoreoAutoFactory, ChoreoAutoLoop> {}

    private final SendableChooser<AutoRoutineGenerator> choreoAutoChooser = new SendableChooser<>();

    private ChoreoAutoLoop lastAutoRoutine = null;

    public ChoreoAutoChooser(ChoreoAutoFactory factory) {
        lastAutoRoutine = factory.newLoop();
        choreoAutoChooser.setDefaultOption("Do Nothing", arg -> arg.newLoop());
        choreoAutoChooser.onChange(
            generator -> {
                if (DriverStation.isDisabled()) {
                    lastAutoRoutine = generator.apply(factory);
                }
            }
        );
    }

    public void addAutoRoutine(String name, AutoRoutineGenerator generator) {
        choreoAutoChooser.addOption(name, generator);
    }

    public void pollSelectedAutoRoutine() {
        lastAutoRoutine.poll();
    }
}
