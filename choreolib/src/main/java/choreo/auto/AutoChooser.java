// Copyright (c) Choreo contributors

package choreo.auto;

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
import java.util.Set;
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
 * #addAutoRoutine(String, AutoRoutineCreator)} method. Unlike {@code SendableChooser} this
 * chooser has to be updated every cycle through an addPeriodic call in your Robot constructor,
 * like so: <code>addPeriodic(autoChooser::update, 0.02);</code>
 *
 * <p>You can set the Robot's autonomous command to the chooser's chosen auto routine via
 * <code>RobotModeTriggers.autonomous.whileTrue(chooser.autoCmd());</code>
 */
public class AutoChooser {
  /**
   * A function that generates an {@link AutoRoutine} from an {@link AutoFactory}.
   * Equivalent to a <code>{@literal Function<AutoFactory, AutoRoutine>}</code>.
   */
  public interface AutoRoutineCreator extends Function<AutoFactory, AutoRoutine> {
    /** A generator that returns an auto routine that does nothing */
    static final AutoRoutineCreator NONE = factory -> AutoFactory.VOID_ROUTINE;
  }

  /**
   * A function that generates a {@link Command} from an {@link AutoFactory}.
   * Equivalent to a <code>{@literal Function<AutoFactory, Command>}</code>.
   */
  public interface CommandCreator extends Function<AutoFactory, Command> {}

  private static final String NONE_NAME = "Nothing";

  private final HashMap<String, AutoRoutineCreator> autoRoutines =
      new HashMap<>(Map.of(NONE_NAME, AutoRoutineCreator.NONE));

  private final StringEntry selected, active;
  private final StringArrayEntry options;

  private final AutoFactory factory;

  private String lastAutoRoutineName = NONE_NAME;
  private AutoRoutine lastAutoRoutine = AutoRoutineCreator.NONE.apply(null);

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
   * <p>The AutoRoutine can only be updated when the robot is disabled. If the chooser in your
   * dashboard says {@code BAD} the {@link AutoChooser} has not responded to the selection yet and
   * you need to disable the robot to update it.
   */
  public void update() {
    if (DriverStation.isDisabled()) {
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
   * Add an AutoRoutine to the chooser.
   *
   * <p>The options of the chooser are actually of type {@link AutoRoutineCreator}. This is a
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
   * public Robot() {
   *   chooser = new AutoChooser(Choreo.createAutoFactory(...), "/Choosers");
   *   addPeriodic(chooser::update, 0.02); // chooser must be updated every loop
   *   // fourPieceRight is a method that accepts an AutoFactory and returns an AutoRoutine.
   *   chooser.addAutoRoutine("4 Piece right", autos::fourPieceRight);
   *   chooser.addAutoRoutine("4 Piece Left", autos::fourPieceLeft);
   *   chooser.addAutoRoutine("3 Piece Close", autos::threePieceClose);
   * }
   * </code></pre>
   *
   * @param name The name of the auto routine.
   * @param generator The function that generates the auto routine.
   */
  public void addAutoRoutine(String name, AutoRoutineCreator generator) {
    autoRoutines.put(name, generator);
    options.set(autoRoutines.keySet().toArray(new String[0]));
  }

  /**
   * Adds a Command to the auto chooser.
   *
   * <p>The options of the chooser are actually of type {@link CommandCreator}. This is a
   * function that takes an {@link AutoFactory} and returns a {@link Command}. These functions
   * can be static, a lambda or belong to a local variable.
   *
   * <p>This is done to load autonomous commands when and only when they are selected,
   * in order to save memory and file loading time for unused autonomous commands.
   *
   * <h3>Example:</h3>
   *
   * <pre><code>
   * AutoChooser chooser;
   * Autos autos = new Autos(swerve, shooter, intake, feeder);
   * public Robot() {
   *   chooser = new AutoChooser(Choreo.createAutoFactory(...), "/Choosers");
   *   addPeriodic(chooser::update, 0.02); // chooser must be updated every loop
   *   // fourPieceLeft is a method that accepts an AutoFactory and returns a command.
   *   chooser.addAutoCmd("4 Piece left", autos::fourPieceLeft);
   *   chooser.addAutoCmd("Just Shoot", factory -> shooter.shoot());
   * }
   * </code></pre>
   *
   * @param name The name of the autonomous command.
   * @param commandGenerator The function that generates an autonomous command.
   * @see AutoChooser#addAutoRoutine
   */
  public void addAuto(String name, CommandCreator commandGenerator) {
    addAutoRoutine(
      name,
      ignored -> factory.commandAsAutoRoutine(commandGenerator.apply(factory))
    );
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
   * Gets a Command that runs the latest selected auto routine,
   * stopping when the selected routine finishes.
   * This Command can directly be bound to a trigger, like so:
   * <pre><code>
   *     AutoChooser chooser = ...;
   *
   *     public Robot() {
   *         RobotModeTriggers.autonomous().whileTrue(chooser.autoCmd());
   *     }
   * </code></pre>
   * @return A command that runs the selected {@link AutoRoutine}
   */
  public Command autoCmd() {
    return Commands.defer(() -> getSelectedAutoRoutine().cmd(), Set.of());
  }
}
