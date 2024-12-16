// Copyright (c) Choreo contributors

package choreo.auto;

import static choreo.auto.AutoTestHelper.setAlliance;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.SchedulerMaker;
import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class RoutineKillNoAllianceTest {
  AutoFactory factoryFlip = AutoTestHelper.factory(true);
  AutoFactory factoryNoFlip = AutoTestHelper.factory(false);
  CommandScheduler scheduler = SchedulerMaker.make();
  Supplier<AutoRoutine> routineFlip = () -> factoryNoFlip.newRoutine("testRoutineKill");
  Supplier<AutoRoutine> routineNoFlip = () -> factoryFlip.newRoutine("testRoutineKill");

  @BeforeEach
  void setup() {
    assert HAL.initialize(500, 0);
    scheduler.cancelAll();
  }

  void testRoutineKill(
      CommandScheduler scheduler, Supplier<AutoRoutine> routineSupplier, boolean expectKill) {
    AutoRoutine routine = routineSupplier.get();
    assertFalse(routine.isKilled);
    scheduler.schedule(routine.cmd());
    // don't need to run, this should kill on schedule/initialize
    assertEquals(expectKill, routine.isKilled);
    scheduler.cancelAll();
  }

  @Test
  void testDisabledEmpty() {
    setAlliance(Optional.empty());
    testRoutineKill(scheduler, routineNoFlip, false);
  }

  @Test
  void testDisabledBlue() {
    setAlliance((Optional.of(Alliance.Blue)));
    testRoutineKill(scheduler, routineNoFlip, false);
  }

  @Test
  void testDisabledRed() {
    setAlliance(Optional.of(Alliance.Red));
    testRoutineKill(scheduler, routineNoFlip, false);
  }

  @Test
  void testEnabledEmpty() {
    setAlliance(Optional.empty());
    testRoutineKill(scheduler, routineFlip, true);
  }

  @Test
  void testEnabledBlue() {
    setAlliance(Optional.of(Alliance.Blue));
    testRoutineKill(scheduler, routineFlip, false);
  }

  @Test
  void testEnabledRed() {
    setAlliance(Optional.of(Alliance.Red));
    testRoutineKill(scheduler, routineFlip, false);
  }
}
