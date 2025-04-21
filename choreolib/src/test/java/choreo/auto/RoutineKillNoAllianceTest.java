// Copyright (c) Choreo contributors

package choreo.auto;

import static choreo.auto.AutoTestHelper.setAlliance;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
    setAlliance((Optional.of(Alliance.Blue)));
    testRoutineKill(routineNoFlip, false);
  }

  @Test
  void testUnFlippedRed() {
    setAlliance(Optional.of(Alliance.Red));
    testRoutineKill(routineNoFlip, false);
  }

  @Test
  void testFlippedEmpty() {
    setAlliance(Optional.empty());
    testRoutineKill(routineFlip, true);
  }

  @Test
  void testFlippedBlue() {
    setAlliance(Optional.of(Alliance.Blue));
    testRoutineKill(routineFlip, false);
  }

  @Test
  void testFlippedRed() {
    setAlliance(Optional.of(Alliance.Red));
    testRoutineKill(routineFlip, false);
  }
}
