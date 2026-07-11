// Copyright (c) Choreo contributors

package choreo.auto;

import static choreo.auto.AutoTestHelper.setAlliance;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.wpilib.driverstation.Alliance;
import org.wpilib.hardware.hal.HAL;

public class RoutineKillNoAllianceTest {
  AutoFactory factoryFlip;
  AutoFactory factoryNoFlip;
  Supplier<AutoRoutine> routineFlip = () -> factoryFlip.newRoutine("testRoutineKill");
  Supplier<AutoRoutine> routineNoFlip = () -> factoryNoFlip.newRoutine("testRoutineKill");

  @BeforeEach
  void setup() {
    assert HAL.initialize(500, 0);
    factoryFlip = AutoTestHelper.factory(true);
    factoryNoFlip = AutoTestHelper.factory(false);
  }

  void testRoutineKill(Supplier<AutoRoutine> routineSupplier, boolean expectKill) {
    AutoRoutine routine = routineSupplier.get();
    assertFalse(routine.isKilled);
    routine.cmd().initialize();
    // don't need to run, this should kill on schedule/initialize
    assertEquals(expectKill, routine.isKilled);
  }

  @Test
  void testUnFlippedEmpty() {
    setAlliance(Optional.empty());
    testRoutineKill(routineNoFlip, false);
  }

  @Test
  void testUnFlippedBlue() {
    setAlliance((Optional.of(Alliance.BLUE)));
    testRoutineKill(routineNoFlip, false);
  }

  @Test
  void testUnFlippedRed() {
    setAlliance(Optional.of(Alliance.RED));
    testRoutineKill(routineNoFlip, false);
  }

  @Test
  void testFlippedEmpty() {
    setAlliance(Optional.empty());
    testRoutineKill(routineFlip, true);
  }

  @Test
  void testFlippedBlue() {
    setAlliance(Optional.of(Alliance.BLUE));
    testRoutineKill(routineFlip, false);
  }

  @Test
  void testFlippedRed() {
    setAlliance(Optional.of(Alliance.RED));
    testRoutineKill(routineFlip, false);
  }
}
