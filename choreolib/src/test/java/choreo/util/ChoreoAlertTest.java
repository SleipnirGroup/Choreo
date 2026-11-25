// Copyright (c) Choreo contributors

package choreo.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.AlertSim;
import org.wpilib.simulation.AlertSim.AlertInfo;
import org.wpilib.util.Alert;
import org.wpilib.util.Alert.Level;

public class ChoreoAlertTest {
  @BeforeEach
  void setup() {
    assert HAL.initialize();
  }

  private static AlertInfo find(String id) {
    return Arrays.stream(AlertSim.getAll())
        .filter(a -> a.id.equals(id))
        .findFirst()
        .orElseThrow(() -> new AssertionError("No alert with id " + id));
  }

  @Test
  void testAlertGroup() {
    try (Alert alert = ChoreoAlert.alert("ChoreoAlertTest alert", "text", Level.HIGH)) {
      assertEquals("Choreo", find("ChoreoAlertTest alert").group);
    }
  }

  @Test
  void testMultiAlertGroup() {
    try (Alert alert =
        ChoreoAlert.multiAlert("ChoreoAlertTest multiAlert", causes -> "text", Level.HIGH)) {
      assertEquals("Choreo", find("ChoreoAlertTest multiAlert").group);
    }
  }
}
