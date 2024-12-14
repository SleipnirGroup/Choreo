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
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.ScheduleCommand;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;

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
 * <p>Once the {@link AutoChooser} is made you can add {@link AutoRoutine}s to it using {@link
 * #addRoutine} or add {@link Command}s to it using {@link #addCmd}. Unlike {@code SendableChooser}
 * this chooser has to be updated every cycle. This can be done using an `addPeriodic` call in the
 * robot's constructor like so: <code>
 * addPeriodic(autoChooser::update, 0.02);</code>
 *
 * <p>You can set the Robot's autonomous command to the chooser's chosen auto routine via <code>
 * RobotModeTriggers.autonomous.whileTrue(chooser.autoSchedulingCmd());</code>
 */
public class AutoChooser {
  static final String NONE_NAME = "__Nothing__";
  private static final Alert selectedNonexistentAuto =
      Choreo.alert("Selected an auto that isn't an option", kError);

  private final HashMap<String, Supplier<Command>> autoRoutines =
      new HashMap<>(Map.of(NONE_NAME, Commands::none));

  private final StringEntry selected, active;
  private final StringArrayEntry options;

  private String lastCommandName = NONE_NAME;
  private Command lastCommand = Commands.none();

  /**
   * Constructs a new {@link AutoChooser}.
   *
   * @param tableName The name of the network table to use for the chooser. Passing in an empty
   *     string or null will put this chooser at the root of the network tables.
   */
  public AutoChooser(String tableName) {
    this(tableName, NetworkTableInstance.getDefault());
  }

  /** Constructs a new {@link AutoChooser}. */
  public AutoChooser() {
    this("", NetworkTableInstance.getDefault());
  }

  AutoChooser(String tableName, NetworkTableInstance ntInstance) {
    if (tableName == null) {
      tableName = "";
    }
    String path = tableName.isEmpty() ? "" : NetworkTable.normalizeKey(tableName, true);
    NetworkTable table = ntInstance.getTable(path + "/AutoChooser");

    selected = table.getStringTopic("selected").getEntry("");
    selected.set(NONE_NAME);

    table.getStringTopic(".type").publish().set("String Chooser");
    table.getStringTopic("default").publish().set(NONE_NAME);

    active = table.getStringTopic("active").getEntry(NONE_NAME);
    active.set(NONE_NAME);

    var defaultOptions = autoRoutines.keySet().toArray(new String[0]);
    options = table.getStringArrayTopic("options").getEntry(defaultOptions);
    options.set(defaultOptions);
  }

  /**
   * Update the auto chooser.
   *
   * <p>This method should be called every cycle in the {@link IterativeRobotBase#robotPeriodic()}
   * or by adding a periodic to {@code TimedRobot}. It will check if the selected auto routine has
   * changed and update the active AutoRoutine.
   *
   * <p>The AutoRoutine can only be updated when the robot is disabled and connected to
   * DriverStation. If the .chooser in your dashboard says {@code BAD} the {@link AutoChooser} has
   * not responded to the selection yet and you need to disable the robot to update it.
   */
  public void update() {
    if (DriverStation.isDisabled()
        && DriverStation.isDSAttached()
        && DriverStation.getAlliance().isPresent()) {
      String selectStr = selected.get();
      if (selectStr.equals(lastCommandName)) return;
      if (!autoRoutines.containsKey(selectStr) && !selectStr.equals(NONE_NAME)) {
        selected.set(NONE_NAME);
        selectStr = NONE_NAME;
        selectedNonexistentAuto.set(true);
      } else {
        selectedNonexistentAuto.set(false);
      }
      lastCommandName = selectStr;
      lastCommand = autoRoutines.get(lastCommandName).get();
      active.set(lastCommandName);
    }
  }

  /**
   * Add an AutoRoutine to the chooser.
   *
   * <p>The options of the chooser are actually a function that takes an {@link AutoFactory} and
   * returns a {@link AutoRoutine}. These functions can be static, a lambda or belong to a local
   * variable.
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
   * public Robot() {
   *   chooser = new AutoChooser("/Choosers");
   *   addPeriodic(chooser::update, 0.02); // chooser must be updated every loop
   *   // fourPieceRight is a method that accepts an AutoFactory and returns an AutoRoutine.
   *   chooser.addRoutine("4 Piece right", autos::fourPieceRight);
   *   chooser.addRoutine("4 Piece Left", autos::fourPieceLeft);
   *   chooser.addRoutine("3 Piece Close", autos::threePieceClose);
   * }
   * </code></pre>
   *
   * @param name The name of the auto routine.
   * @param generator The function that generates the auto routine.
   */
  public void addRoutine(String name, Supplier<AutoRoutine> generator) {
    autoRoutines.put(name, () -> generator.get().cmd());
    options.set(autoRoutines.keySet().toArray(new String[0]));
  }

  /**
   * Adds a Command to the auto chooser.
   *
   * <p>This is done to load autonomous commands when and only when they are selected, in order to
   * save memory and file loading time for unused autonomous commands.
   *
   * <h3>Example:</h3>
   *
   * <pre><code>
   * AutoChooser chooser;
   * Autos autos = new Autos(swerve, shooter, intake, feeder);
   * public Robot() {
   *   chooser = new AutoChooser("/Choosers");
   *   addPeriodic(chooser::update, 0.02); // chooser must be updated every loop
   *   // fourPieceLeft is a method that accepts an AutoFactory and returns a command.
   *   chooser.addCmd("4 Piece left", autos::fourPieceLeft);
   *   chooser.addCmd("Just Shoot", shooter::shoot);
   * }
   * </code></pre>
   *
   * @param name The name of the autonomous command.
   * @param generator The function that generates an autonomous command.
   * @see AutoChooser#addRoutine
   */
  public void addCmd(String name, Supplier<Command> generator) {
    autoRoutines.put(name, generator);
    options.set(autoRoutines.keySet().toArray(new String[0]));
  }

  /**
   * Gets a Command that schedules the selected auto routine. This Command finishes immediately as
   * it simply schedules another Command. This Command can directly be bound to a trigger, like so:
   *
   * <pre><code>
   *     AutoChooser chooser = ...;
   *
   *     public Robot() {
   *         RobotModeTriggers.autonomous().onTrue(chooser.selectedCommandScheduler());
   *     }
   * </code></pre>
   *
   * @return A command that runs the selected {@link AutoRoutine}
   */
  public Command selectedCommandScheduler() {
    // .asProxy() not needed; requirements are dynamically allocated
    // via triggers, and are not part of the routine command itself
    return Commands.defer(() -> new ScheduleCommand(this.lastCommand), Set.of());
  }

  /**
   * Returns the currently selected command.
   *
   * <p>If you plan on using this {@link Command} in a {@code Trigger} it is recommended to use
   * {@link #selectedCommandScheduler()} instead.
   *
   * @return The currently selected command.
   */
  public Command selectedCommand() {
    return lastCommand.withName(lastCommandName);
  }
}
