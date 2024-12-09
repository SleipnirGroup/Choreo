// Copyright (c) Choreo contributors

package choreo.auto;

import static edu.wpi.first.wpilibj.Alert.AlertType.kError;

import choreo.Choreo;
import edu.wpi.first.networktables.NetworkTable;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.networktables.StringArrayEntry;
import edu.wpi.first.networktables.StringEntry;
import edu.wpi.first.wpilibj.Alert;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.IterativeRobotBase;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * An Choreo specific {@code SendableChooser} that allows for the selection of {@link AutoRoutine}s
 * at runtime via a <a
 * href="https://docs.wpilib.org/en/stable/docs/software/dashboards/index.html#dashboards">Dashboard</a>.
 *
 * <p>This chooser takes a <a href="https://en.wikipedia.org/wiki/Lazy_loading">lazy loading</a>
 * approach to {@link AutoRoutine}s, only generating the {@link AutoRoutine} when it is selected.
 * This approach has the benefit of not loading all autos on startup, but also not loading the auto
 * during auto start causing a delay.
 *
 * <p>Once the {@link AutoChooser} is made you can add {@link AutoRoutine}s to it using the {@link
 * #addAutoRoutine(String, AutoRoutineGenerator)} method. Unlike {@code SendableChooser} this
 * chooser has to be updated every cycle by calling the {@link #update()} method in your {@link
 * IterativeRobotBase#robotPeriodic()}.
 *
 * <p>You can retrieve the {@link AutoRoutine} that is currently selected by calling the {@link
 * #getSelectedAutoRoutine()} method.
 */
public class AutoChooser {
  /** A function that generates an {@link AutoRoutine} from an {@link AutoFactory}. */
  public static interface AutoRoutineGenerator extends Function<AutoFactory, AutoRoutine> {
    /** A generator that returns an auto routine that does nothing */
    static final AutoRoutineGenerator NONE = factory -> AutoFactory.VOID_ROUTINE;
  }

  private static final String NONE_NAME = "Nothing";

  private static final Alert notAnOption =
      Choreo.alert("Selected an auto that isn't an option", kError);

  private final HashMap<String, AutoRoutineGenerator> autoRoutines =
      new HashMap<>(Map.of(NONE_NAME, AutoRoutineGenerator.NONE));

  private final StringEntry selected, active;
  private final StringArrayEntry options;

  private final AutoFactory factory;

  private String lastAutoRoutineName = NONE_NAME;
  private AutoRoutine lastAutoRoutine = AutoRoutineGenerator.NONE.apply(null);

  /**
   * Constructs a new {@link AutoChooser}.
   *
   * @param factory The auto factory to use for AutoRoutine creation.
   * @param tableName The name of the network table to use for the chooser. Passing in an empty
   *     string or null will put this chooser at the root of the network tables.
   */
  public AutoChooser(AutoFactory factory, String tableName) {
    this.factory = factory;

    if (tableName == null) {
      tableName = "";
    }
    String path =
        (tableName.isEmpty()) ? NetworkTable.normalizeKey(tableName, true) : "" + "/AutoChooser";
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
   * It will check if the selected auto routine has changed and update the active AutoRoutine.
   *
   * <p>The AutoRoutine can only be updated when the robot is disabled and connected to
   * DriverStation. If the chooser in your dashboard says {@code BAD} the {@link AutoChooser} has
   * not responded to the selection yet and you need to disable the robot to update it.
   */
  public void update() {
    if (DriverStation.isDisabled()
        && DriverStation.isDSAttached()
        && DriverStation.getAlliance().isPresent()) {
      String selectStr = selected.get();
      if (selectStr.equals(lastAutoRoutineName)) return;
      if (!autoRoutines.containsKey(selectStr)) {
        selected.set(NONE_NAME);
        selectStr = NONE_NAME;
        notAnOption.set(true);
      } else {
        notAnOption.set(false);
      }
      lastAutoRoutineName = selectStr;
      lastAutoRoutine = autoRoutines.get(lastAutoRoutineName).apply(this.factory);
      active.set(lastAutoRoutineName);
    }
  }

  /**
   * Add an AutoRoutine to the chooser.
   *
   * <p>The options of the chooser are actually of type {@link AutoRoutineGenerator}. This is a
   * function that takes an {@link AutoFactory} and returns a {@link AutoRoutine}. These functions
   * can be static, a lambda or belong to a local variable.
   *
   * <p>This is done to load AutoRoutines when and only when they are selected, in order to save
   * memory and file loading time for unused AutoRoutines.
   *
   * <p>One way to keep this clean is to make an `Autos` class that all of your subsystems/resources
   * are <a href="https://en.wikipedia.org/wiki/Dependency_injection">dependency injected</a> into.
   * Then create methods inside that class that take an {@link AutoFactory} and return an {@link
   * AutoRoutine}.
   *
   * <h3>Example:</h3>
   *
   * <pre><code>
   * AutoChooser chooser;
   * Autos autos = new Autos(swerve, shooter, intake, feeder);
   * Robot() {
   *   chooser = new AutoChooser(Choreo.createAutoFactory(...), "/Choosers");
   *   chooser.addAutoRoutine("4 Piece right", autos::fourPieceRight);
   *   chooser.addAutoRoutine("4 Piece Left", autos::fourPieceLeft);
   *   chooser.addAutoRoutine("3 Piece Close", autos::threePieceClose);
   *   chooser.addAutoRoutine("Just Shoot", factory -> factory.commandAsAutoRoutine(shooter.shoot()));
   * }
   * </code></pre>
   *
   * @param name The name of the auto routine.
   * @param generator The function that generates the auto routine.
   */
  public void addAutoRoutine(String name, AutoRoutineGenerator generator) {
    autoRoutines.put(name, generator);
    options.set(autoRoutines.keySet().toArray(new String[0]));
  }

  /**
   * Get the currently selected {@link AutoRoutine}.
   *
   * <h3>Recommended Usage</h3>
   *
   * Scheduling it as a command.
   *
   * <pre><code>
   * AutoChooser chooser = ...;
   *
   * public void autonomousInit() {
   *   CommandScheduler.getInstance().schedule(chooser.getSelectedAutoRoutine().cmd());
   * }
   * </code></pre>
   *
   * Polling it yourself.
   *
   * <pre><code>
   * AutoChooser chooser = ...;
   * AutoRoutine routine = chooser.getSelectedAutoRoutine();
   *
   * public void autonomousInit() {
   *   routine = chooser.getSelectedAutoRoutine();
   * }
   *
   * public void autonomousPeriodic() {
   *  routine.poll();
   * }
   *
   * public void autonomousExit() {
   *   routine.reset();
   * }
   * </code></pre>
   *
   * @return The currently selected {@link AutoRoutine}.
   */
  public AutoRoutine getSelectedAutoRoutine() {
    return lastAutoRoutine;
  }

  /**
   * Get the {@link AutoFactory} used by this chooser.
   *
   * @return The {@link AutoFactory} used by this chooser.
   */
  public AutoFactory factory() {
    return factory;
  }
}
