// Copyright (c) Choreo contributors

package choreo.auto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.wpilib.command2.Commands;
import org.wpilib.hardware.hal.AllianceStationID;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.tunable.MockTunableBackend;
import org.wpilib.tunable.TunableRegistry;
import org.wpilib.tunable.Tunables;

public class AutoChooserTest {
  private MockTunableBackend backend;

  @BeforeEach
  public void setup() {
    assert HAL.initialize();
    TunableRegistry.reset();
    backend = new MockTunableBackend();
    TunableRegistry.registerBackend("", backend);
  }

  @AfterEach
  public void tearDown() {
    TunableRegistry.reset();
  }

  private String chooserPath(String testFuncName) {
    return "/Test/AutoChooser/" + testFuncName;
  }

  private void assertNTSelected(String testFuncName, String expected) {
    assertEquals(expected, backend.getValue(chooserPath(testFuncName) + "/selected", String.class));
  }

  private void assertNTActive(String testFuncName, String expected) {
    assertEquals(expected, backend.getValue(chooserPath(testFuncName) + "/active", String.class));
  }

  private void assertNTDefault(String testFuncName, String expectedDefault) {
    assertEquals(
        expectedDefault, backend.getValue(chooserPath(testFuncName) + "/default", String.class));
  }

  private void assertNTOptions(String testFuncName, String... expected) {
    Set<String> options =
        Set.of(backend.getValue(chooserPath(testFuncName) + "/options", String[].class));

    assertEquals(expected.length, options.size());
    for (int i = 0; i < expected.length; i++) {
      assertTrue(options.contains(expected[i]), "Missing option: " + expected[i]);
    }
  }

  private void selectNT(String testFuncName, String value) {
    backend.setValue(chooserPath(testFuncName) + "/selected", value);
  }

  @Test
  public void initializeTest() {
    final String fnName = "initializeTest";
    final var chooser = new AutoChooser();
    Tunables.publish(chooserPath(fnName), chooser);
    TunableRegistry.update();
    assertNTSelected(fnName, chooser.getDefaultName());
    assertNTActive(fnName, chooser.getDefaultName());
    assertNTDefault(fnName, chooser.getDefaultName());
    assertNTOptions(fnName, chooser.getDefaultName());
  }

  @Test
  public void addAutoTest() {
    final String fnName = "addAutoTest";
    AutoFactory factory = AutoTestHelper.factory();
    AutoChooser chooser = new AutoChooser();
    Tunables.publish(chooserPath(fnName), chooser);
    chooser.addCmd("AddAutoTestCommand", () -> Commands.none().withName("AddAutoTestCommand"));
    chooser.addRoutine("AddAutoTestRoutine", () -> factory.newRoutine("AddAutoTestRoutine"));

    TunableRegistry.update();

    assertNTOptions(fnName, chooser.getDefaultName(), "AddAutoTestCommand", "AddAutoTestRoutine");
  }

  @Test
  public void selectTest() {
    final String fnName = "selectTest";
    AutoFactory factory = AutoTestHelper.factory();
    AutoChooser chooser = new AutoChooser();
    Tunables.publish(chooserPath(fnName), chooser);
    chooser.addCmd("SelectTestCommand", () -> Commands.none().withName("SelectTestCommand"));
    chooser.addRoutine("SelectTestRoutine", () -> factory.newRoutine("SelectTestRoutine"));

    TunableRegistry.update();

    selectNT(fnName, "SelectTestRoutine");
    TunableRegistry.update();
    assertNTSelected(fnName, "SelectTestRoutine");
    assertNTActive(fnName, chooser.getDefaultName());

    TunableRegistry.update();

    // DriverStation should report disconnected causing the active to not update
    assertNTActive(fnName, chooser.getDefaultName());

    DriverStationSim.setAllianceStationId(AllianceStationID.BLUE_1);
    DriverStationSim.setEnabled(false);
    DriverStationSim.setDsAttached(true);
    DriverStationSim.notifyNewData();

    TunableRegistry.update();
    TunableRegistry.update();

    assertNTActive(fnName, "SelectTestRoutine");

    assertEquals(chooser.selectedCommand().getName(), "SelectTestRoutine");

    DriverStationSim.setAllianceStationId(AllianceStationID.UNKNOWN);
    DriverStationSim.setDsAttached(false);
    DriverStationSim.notifyNewData();
  }
}
