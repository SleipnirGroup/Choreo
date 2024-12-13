// Copyright (c) Choreo contributors

package choreo.auto;

import static org.junit.jupiter.api.Assertions.assertEquals;

import edu.wpi.first.hal.AllianceStationID;
import edu.wpi.first.hal.HAL;
import edu.wpi.first.networktables.NetworkTable;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj2.command.Commands;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class AutoChooserTest {
  private static final String NONE_NAME = AutoChooser.NONE_NAME;

  private String chooserPath(String testFuncName) {
    return "/Test/AutoChooser/" + testFuncName;
  }

  private NetworkTable table(String testFuncName, NetworkTableInstance ntInstance) {
    // i'm unsure if this is needed but it won't hurt
    ntInstance.flushLocal();
    return ntInstance.getTable(chooserPath(testFuncName) + "/AutoChooser");
  }

  private void assertNTType(String testFuncName, NetworkTableInstance ntInstance) {
    String type = table(testFuncName, ntInstance).getEntry(".type").getString("");
    assertEquals("String Chooser", type);
  }

  private void assertNTSelected(
      String testFuncName, String expected, NetworkTableInstance ntInstance) {
    String type = table(testFuncName, ntInstance).getEntry("selected").getString("");
    assertEquals(expected, type);
  }

  private void assertNTActive(
      String testFuncName, String expected, NetworkTableInstance ntInstance) {
    String type = table(testFuncName, ntInstance).getEntry("active").getString("");
    assertEquals(expected, type);
  }

  private void assertNTDefault(String testFuncName, NetworkTableInstance ntInstance) {
    String type = table(testFuncName, ntInstance).getEntry("default").getString("");
    assertEquals(NONE_NAME, type);
  }

  private void assertNTOptions(
      String testFuncName, NetworkTableInstance ntInstance, String... expected) {
    String[] options =
        table(testFuncName, ntInstance).getEntry("options").getStringArray(new String[0]);

    assertEquals(expected.length, options.length);
    for (int i = 0; i < expected.length; i++) {
      assertEquals(expected[i], options[i]);
    }
  }

  private void selectNT(String testFuncName, String value, NetworkTableInstance ntInstance) {
    table(testFuncName, ntInstance).getEntry("selected").setString(value);
  }

  @BeforeEach
  public void setup() {
    assert HAL.initialize(500, 0);
  }

  @Test
  public void initializeTest() {
    final String fnName = "initializeTest";
    AutoFactory factory = AutoTestHelper.factory();
    try (var ntInstance = NetworkTableInstance.create()) {
      new AutoChooser(factory, chooserPath(fnName), ntInstance);
      assertNTType(fnName, ntInstance);
      assertNTSelected(fnName, NONE_NAME, ntInstance);
      assertNTActive(fnName, NONE_NAME, ntInstance);
      assertNTDefault(fnName, ntInstance);
      assertNTOptions(fnName, ntInstance, NONE_NAME);
    }
  }

  @Test
  public void addAutoTest() {
    final String fnName = "addAutoTest";
    AutoFactory factory = AutoTestHelper.factory();
    try (var ntInstance = NetworkTableInstance.create()) {
      AutoChooser chooser = new AutoChooser(factory, chooserPath(fnName), ntInstance);
      chooser.addAutoCmd("AddAutoTestCommand", f -> Commands.none().withName("AddAutoTestCommand"));
      chooser.addAutoRoutine("AddAutoTestRoutine", f -> f.newRoutine("AddAutoTestRoutine"));
      assertNTOptions(fnName, ntInstance, NONE_NAME, "AddAutoTestCommand", "AddAutoTestRoutine");
    }
  }

  @Test
  public void selectTest() {
    final String fnName = "selectTest";
    AutoFactory factory = AutoTestHelper.factory();
    try (var ntInstance = NetworkTableInstance.create()) {
      AutoChooser chooser = new AutoChooser(factory, chooserPath(fnName), ntInstance);
      chooser.addAutoCmd("SelectTestCommand", f -> Commands.none().withName("SelectTestCommand"));
      chooser.addAutoRoutine("SelectTestRoutine", f -> f.newRoutine("SelectTestRoutine"));
      selectNT(fnName, "SelectTestRoutine", ntInstance);
      assertNTSelected(fnName, "SelectTestRoutine", ntInstance);
      assertNTActive(fnName, NONE_NAME, ntInstance);

      chooser.update();

      // DriverStation should report disconnected causing the active to not update
      assertNTActive(fnName, NONE_NAME, ntInstance);

      DriverStationSim.setAllianceStationId(AllianceStationID.Blue1);
      DriverStationSim.setEnabled(false);
      DriverStationSim.setDsAttached(true);
      DriverStationSim.notifyNewData();
      DriverStation.refreshData();

      chooser.update();

      assertNTActive(fnName, "SelectTestRoutine", ntInstance);

      assertEquals(chooser.getSelectedAutoRoutine().name, "SelectTestRoutine");

      DriverStationSim.setAllianceStationId(AllianceStationID.Unknown);
      DriverStationSim.setDsAttached(false);
      DriverStationSim.notifyNewData();
    }
  }
}
