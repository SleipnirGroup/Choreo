// Copyright (c) Choreo contributors

package choreo.commands3;

import static choreo.commands3.AutoTestHelper.setAlliance;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.wpilib.driverstation.Alliance;

/**
 * The Commands v3 equivalent of v2's {@code RoutineKillNoAllianceTest}. A routine that needs to
 * flip for the alliance must refuse to start when the alliance is unknown. v3 has no kill, so the
 * routine just never becomes active.
 */
@ResourceLock("timing")
public class RoutineNoAllianceTest {
  AutoFactory factoryFlip;
  AutoFactory factoryNoFlip;
  Supplier<AutoRoutine> routineFlip = () -> new AutoRoutine(factoryFlip, "testRoutine") {};
  Supplier<AutoRoutine> routineNoFlip = () -> new AutoRoutine(factoryNoFlip, "testRoutine") {};

  @BeforeEach
  void setup() {
    AutoTestHelper.setUpSim();
    factoryFlip = AutoTestHelper.factory(true);
    factoryNoFlip = AutoTestHelper.factory(false);
  }

  @AfterEach
  void tearDown() {
    AutoTestHelper.tearDownSim();
  }

  void testRoutineStart(Supplier<AutoRoutine> routineSupplier, boolean expectStart) {
    AutoRoutine routine = routineSupplier.get();
    assertFalse(routine.isActive(), "not active before the opmode starts");
    routine.start();
    assertEquals(expectStart, routine.isActive());
    routine.end();
    assertFalse(routine.isActive(), "not active after the opmode ends");
  }

  @Test
  void testUnFlippedEmpty() {
    setAlliance(Optional.empty());
    testRoutineStart(routineNoFlip, true);
  }

  @Test
  void testUnFlippedBlue() {
    setAlliance((Optional.of(Alliance.BLUE)));
    testRoutineStart(routineNoFlip, true);
  }

  @Test
  void testUnFlippedRed() {
    setAlliance(Optional.of(Alliance.RED));
    testRoutineStart(routineNoFlip, true);
  }

  @Test
  void testFlippedEmpty() {
    setAlliance(Optional.empty());
    testRoutineStart(routineFlip, false);
  }

  @Test
  void testFlippedBlue() {
    setAlliance(Optional.of(Alliance.BLUE));
    testRoutineStart(routineFlip, true);
  }

  @Test
  void testFlippedRed() {
    setAlliance(Optional.of(Alliance.RED));
    testRoutineStart(routineFlip, true);
  }
}
