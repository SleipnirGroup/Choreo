// Copyright (c) Choreo contributors

package choreo.auto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.wpi.first.hal.AllianceStationID;
import edu.wpi.first.hal.HAL;
import edu.wpi.first.networktables.NetworkTable;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj.smartdashboard.SendableBuilderImpl;
import edu.wpi.first.wpilibj2.command.Commands;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class AutoChooserTest {
  private static final String NONE_NAME = AutoChooser.NONE_NAME;
  private static final String NOT_FOUND = "__NOT_FOUND__";

  private SendableBuilderImpl builder;
  private NetworkTableInstance ntInstance;

  @BeforeEach
  public void setup() {
    assert HAL.initialize(500, 0);
    ntInstance = NetworkTableInstance.create();
    builder = new SendableBuilderImpl();
    builder.startListeners();

    ntInstance.stopClient();
    ntInstance.stopServer();
    ntInstance.startLocal();
  }

  @AfterEach
  public void tearDown() {
    ntInstance.close();
    builder.close();
    builder.clearProperties();
    builder.stopListeners();
  }

  private String chooserPath(String testFuncName) {
    return "/Test/AutoChooser/" + testFuncName;
  }

  private NetworkTable table(String testFuncName) {
    // i'm unsure if this is needed but it won't hurt
    ntInstance.flushLocal();
    return ntInstance.getTable(chooserPath(testFuncName) + "/AutoChooser");
  }

  private void assertNTType(String testFuncName) {
    String type = table(testFuncName).getEntry(".type").getString(NOT_FOUND);
    assertEquals("String Chooser", type);
  }

  private void assertNTSelected(String testFuncName, String expected) {
    String type = table(testFuncName).getEntry("selected").getString(NOT_FOUND);
    assertEquals(expected, type);
  }

  private void assertNTActive(String testFuncName, String expected) {
    String type = table(testFuncName).getEntry("active").getString(NOT_FOUND);
    assertEquals(expected, type);
  }

  private void assertNTDefault(String testFuncName) {
    String type = table(testFuncName).getEntry("default").getString(NOT_FOUND);
    assertEquals(NONE_NAME, type);
  }

  private void assertNTOptions(String testFuncName, String... expected) {
    Set<String> options =
        Set.of(table(testFuncName).getEntry("options").getStringArray(new String[0]));

    assertEquals(expected.length, options.size());
    for (int i = 0; i < expected.length; i++) {
      assertTrue(options.contains(expected[i]), "Missing option: " + expected[i]);
    }
  }

  private void selectNT(String testFuncName, String value) {
    table(testFuncName).getEntry("selected").setString(value);
  }

  @Test
  public void initializeTest() {
    final String fnName = "initializeTest";
    builder.setTable(table(fnName));
    new AutoChooser().initSendable(builder);
    builder.update();
    assertNTType(fnName);
    assertNTSelected(fnName, NOT_FOUND);
    assertNTActive(fnName, NONE_NAME);
    assertNTDefault(fnName);
    assertNTOptions(fnName, NONE_NAME);
  }

  @Test
  public void addAutoTest() {
    final String fnName = "addAutoTest";
    builder.setTable(table(fnName));
    AutoFactory factory = AutoTestHelper.factory();
    AutoChooser chooser = new AutoChooser();
    chooser.initSendable(builder);
    chooser.addCmd("AddAutoTestCommand", () -> Commands.none().withName("AddAutoTestCommand"));
    chooser.addRoutine("AddAutoTestRoutine", () -> factory.newRoutine("AddAutoTestRoutine"));

    builder.update();

    assertNTOptions(fnName, NONE_NAME, "AddAutoTestCommand", "AddAutoTestRoutine");
  }

  @Test
  public void selectTest() {
    final String fnName = "selectTest";
    builder.setTable(table(fnName));
    AutoFactory factory = AutoTestHelper.factory();
    AutoChooser chooser = new AutoChooser();
    chooser.initSendable(builder);
    chooser.addCmd("SelectTestCommand", () -> Commands.none().withName("SelectTestCommand"));
    chooser.addRoutine("SelectTestRoutine", () -> factory.newRoutine("SelectTestRoutine"));

    builder.update();

    selectNT(fnName, "SelectTestRoutine");
    assertNTSelected(fnName, "SelectTestRoutine");
    assertNTActive(fnName, NONE_NAME);

    builder.update();

    // DriverStation should report disconnected causing the active to not update
    assertNTActive(fnName, NONE_NAME);

    DriverStationSim.setAllianceStationId(AllianceStationID.Blue1);
    DriverStationSim.setEnabled(false);
    DriverStationSim.setDsAttached(true);
    DriverStationSim.notifyNewData();
    DriverStation.refreshData();

    builder.update();
    builder.update();

    assertNTActive(fnName, "SelectTestRoutine");

    assertEquals(chooser.selectedCommand().getName(), "SelectTestRoutine");

    DriverStationSim.setAllianceStationId(AllianceStationID.Unknown);
    DriverStationSim.setDsAttached(false);
    DriverStationSim.notifyNewData();
    DriverStation.refreshData();
  }
}
