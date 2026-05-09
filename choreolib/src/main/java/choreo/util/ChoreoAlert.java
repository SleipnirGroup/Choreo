// Copyright (c) Choreo contributors

package choreo.util;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import org.wpilib.driverstation.Alert;
import org.wpilib.driverstation.Alert.Level;

/** A utility class for creating alerts under the "Choreo Alerts" group. */
public class ChoreoAlert {
  /**
   * Creates an alert under the "Choreo" group.
   *
   * @param name The name of the alert
   * @param level The level of alert
   * @return an Alert published under the "Choreo" group
   */
  public static Alert alert(String name, Level level) {
    return new Alert("Choreo Alerts", name, level);
  }

  /**
   * Creates a {@link MultiAlert} under the "Choreo" group.
   *
   * @param textGenerator A function that accepts a list of causes and returns an alert message
   * @param level The level of alert
   * @return a MultiAlert published under the "Choreo" group
   */
  public static MultiAlert multiAlert(Function<List<String>, String> textGenerator, Level level) {
    return new MultiAlert(textGenerator, level);
  }

  /**
   * An alert that can have multiple causes. Utilizes a function to generate an error message from a
   * list of causes.
   */
  public static class MultiAlert extends Alert {
    private final Function<List<String>, String> textGenerator;
    private final List<String> causes = new ArrayList<>();

    MultiAlert(Function<List<String>, String> textGenerator, Level level) {
      super("Choreo Alerts", textGenerator.apply(List.of()), level);
      this.textGenerator = textGenerator;
    }

    /**
     * Adds an error causer to this alert, and pushes the alert to NetworkTables if it is not
     * already present.
     *
     * @param name The name of the error causer
     */
    public void addCause(String name) {
      causes.add(name);
      setText(textGenerator.apply(causes));
      set(true);
    }
  }

  /** Factory class. */
  private ChoreoAlert() {}

  /**
   * An alert to be used when alliance-dependent logic is called before an alliance has been
   * determined.
   */
  public static final Alert allianceNotReady =
      ChoreoAlert.alert("Alliance used but not ready", Level.HIGH);
}
