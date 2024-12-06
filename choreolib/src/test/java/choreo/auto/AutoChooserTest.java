// Copyright (c) Choreo contributors

package choreo.auto;

import static org.junit.jupiter.api.Assertions.assertEquals;

import edu.wpi.first.networktables.NetworkTable;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.wpilibj2.command.Commands;
import org.junit.jupiter.api.Test;

public class AutoChooserTest {
  private static final String NONE_NAME = AutoChooser.NONE_NAME;

  private String chooserPath(String testFuncName) {
    return "/Test/AutoChooser/" + testFuncName;
  }

  private String tablePath(String testFuncName) {
    return chooserPath(testFuncName) + "/AutoChooser";
  }

  private NetworkTable table(String testFuncName) {
    // i'm unsure if this is needed but it won't hurt
    NetworkTableInstance.getDefault().flushLocal();
    return NetworkTableInstance.getDefault().getTable(tablePath(testFuncName));
  }

  private void assertNTType(String testFuncName) {
    String type = table(tablePath(testFuncName)).getEntry("type").getString("");
    assertEquals("String Chooser", type);
  }

  private void assertNTSelected(String testFuncName, String expected) {
    String type = table(tablePath(testFuncName)).getEntry("selected").getString("");
    assertEquals(expected, type);
  }

  private void assertNTActive(String testFuncName, String expected) {
    String type = table(tablePath(testFuncName)).getEntry("active").getString("");
    assertEquals(expected, type);
  }

  private void assertNTDefault(String testFuncName) {
    String type = table(tablePath(testFuncName)).getEntry("default").getString("");
    assertEquals(NONE_NAME, type);
  }

  private void assertNTOptions(String testFuncName, String... expected) {
    String[] options =
        table(tablePath(testFuncName)).getEntry("options").getStringArray(new String[0]);
    assertEquals(expected.length, options.length);
    for (int i = 0; i < expected.length; i++) {
      assertEquals(expected[i], options[i]);
    }
  }

  @Test
  public void initializeTest() {
    AutoFactory factory = AutoTestHelper.factory();
    new AutoChooser(factory, chooserPath("initializeTest"));
    assertNTType("initializeTest");
    assertNTSelected("initializeTest", NONE_NAME);
    assertNTActive("initializeTest", NONE_NAME);
    assertNTDefault("initializeTest");
    assertNTOptions("initializeTest", NONE_NAME);
  }

  @Test
  public void addAutoTest() {
    AutoFactory factory = AutoTestHelper.factory();
    AutoChooser chooser = new AutoChooser(factory, chooserPath("selectTest"));
    chooser.addAutoCmd("SelectTestCmd", f -> Commands.none().withName("SelectTestCmd"));
    chooser.addAutoRoutine("SelectTestRoutine", f -> f.newRoutine("SelectTestRoutine"));
    assertNTOptions("selectTest", NONE_NAME, "SelectTestCmd", "SelectTestRoutine");
  }
}
