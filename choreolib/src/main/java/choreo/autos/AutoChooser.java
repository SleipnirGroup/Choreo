// Copyright (c) Choreo contributors

package choreo.autos;

import edu.wpi.first.networktables.NetworkTable;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.networktables.StringArrayEntry;
import edu.wpi.first.networktables.StringEntry;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.IterativeRobotBase;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * An auto chooser that allows for the selection of auto routines at runtime.
 *
 * <p>This chooser takes a lazy loading approach to auto routines, only generating the auto routine
 * when it is selected. This approach has the benefit of not loading all autos on startup, but also
 * not loading the auto during auto start causing a delay.
 *
 * <p>Once the {@link AutoChooser} is made you can add auto routines to it using the {@link
 * #addAutoRoutine(String, AutoRoutineGenerator)} method. Unlike {@code SendableChooser} this
 * chooser has to be updated every cycle by calling the {@link #update()} method in your {@link
 * IterativeRobotBase#robotPeriodic()}.
 *
 * <p>You can retrieve the auto routine {@link Command} that is currently selected by calling the
 * {@link #getSelectedAutoRoutine()} method.
 */
public class AutoChooser {
  /** A function that generates an auto routine {@link Command} from an {@link AutoFactory}. */
  public static interface AutoRoutineGenerator extends Function<AutoFactory, Command> {
    /** A generator that returns a command that does nothing */
    static final AutoRoutineGenerator NONE = factory -> Commands.none().withName("Do Nothing Auto");
  }

  private static final String NONE_NAME = "Nothing";

  private final HashMap<String, AutoRoutineGenerator> autoRoutines =
      new HashMap<>(Map.of(NONE_NAME, AutoRoutineGenerator.NONE));

  private final StringEntry selected, active;
  private final StringArrayEntry options;

  private final AutoFactory factory;

  private String lastAutoRoutineName = NONE_NAME;
  private Command lastAutoRoutine = AutoRoutineGenerator.NONE.apply(null);

  /**
   * Create a new auto chooser.
   *
   * @param factory The auto factory to use for auto routine generation.
   * @param tableName The name of the network table to use for the chooser, passing in an empty
   *     string will put this chooser at the root of the network tables.
   */
  public AutoChooser(AutoFactory factory, String tableName) {
    this.factory = factory;

    String path = NetworkTable.normalizeKey(tableName, true) + "/AutoChooser";
    NetworkTable table = NetworkTableInstance.getDefault().getTable(path);

    selected = table.getStringTopic("selected").getEntry(NONE_NAME);
    table.getStringTopic(".type").publish().set("String Chooser");
    table.getStringTopic("default").publish().set(NONE_NAME);
    active = table.getStringTopic("active").getEntry(NONE_NAME);
    options =
        table.getStringArrayTopic("options").getEntry(autoRoutines.keySet().toArray(new String[0]));
  }

  /**
   * Update the auto chooser.
   *
   * <p>This method should be called every cycle in the {@link IterativeRobotBase#robotPeriodic()}.
   * It will check if the selected auto routine has changed and update the active auto routine.
   */
  public void update() {
    if (DriverStation.isDisabled() || IterativeRobotBase.isSimulation()) {
      String selectStr = selected.get();
      if (selectStr.equals(lastAutoRoutineName)) return;
      if (!autoRoutines.containsKey(selectStr)) {
        selected.set(NONE_NAME);
        selectStr = NONE_NAME;
        DriverStation.reportError("Selected an auto that isn't an option", false);
      }
      lastAutoRoutineName = selectStr;
      lastAutoRoutine = autoRoutines.get(lastAutoRoutineName).apply(this.factory);
      active.set(lastAutoRoutineName);
    }
  }

  /**
   * Add an auto routine to the chooser.
   *
   * <p>An auto routine is a function that takes an AutoFactory and returns a Command. These
   * functions can be static, a lambda or belong to a local variable.
   *
   * <p>A good paradigm is making an `AutoRoutines` class that has a reference to all your
   * subsystems and has helper methods for auto commands inside it. Then you crate methods inside
   * that class that take an `AutoFactory` and return a `Command`.
   *
   * @param name The name of the auto routine.
   * @param generator The function that generates the auto routine.
   */
  public void addAutoRoutine(String name, AutoRoutineGenerator generator) {
    autoRoutines.put(name, generator);
    options.set(autoRoutines.keySet().toArray(new String[0]));
  }

  /**
   * Choose an auto routine by name.
   *
   * @param choice The name of the auto routine to choose.
   */
  public void choose(String choice) {
    selected.set(choice);
    update();
  }

  /**
   * Get the currently selected auto routine.
   *
   * @return The currently selected auto routine.
   */
  public Command getSelectedAutoRoutine() {
    return lastAutoRoutine;
  }
}
