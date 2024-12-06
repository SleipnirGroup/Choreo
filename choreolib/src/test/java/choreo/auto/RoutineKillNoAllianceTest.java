package choreo.auto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.SchedulerMaker;
import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class RoutineKillNoAllianceTest {
  Optional<Alliance> alliance;
  boolean useAllianceFlipping;
  AutoFactory factory = AutoTestHelper.factory(() -> alliance, () -> useAllianceFlipping);
  CommandScheduler scheduler = SchedulerMaker.make();
  Supplier<AutoRoutine> routine = () -> factory.newRoutine("testRoutineKill");

  @BeforeEach
  void setup() {
    scheduler.cancelAll();
    factory = AutoTestHelper.factory(() -> alliance, () -> useAllianceFlipping);
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
    useAllianceFlipping = false;
    alliance = Optional.empty();
    testRoutineKill(scheduler, routine, false);
  }

  @Test
  void testDisabledBlue() {
    useAllianceFlipping = false;
    alliance = Optional.of(Alliance.Blue);
    testRoutineKill(scheduler, routine, false);
  }

  @Test
  void testDisabledRed() {
    useAllianceFlipping = false;
    alliance = Optional.of(Alliance.Red);
    testRoutineKill(scheduler, routine, false);
  }

  @Test
  void testEnabledEmpty() {
    useAllianceFlipping = true;
    alliance = Optional.empty();
    testRoutineKill(scheduler, routine, true);
  }

  @Test
  void testEnabledBlue() {
    useAllianceFlipping = true;
    alliance = Optional.of(Alliance.Blue);
    testRoutineKill(scheduler, routine, false);
  }

  @Test
  void testEnabledRed() {
    useAllianceFlipping = true;
    alliance = Optional.of(Alliance.Red);
    testRoutineKill(scheduler, routine, false);
  }
}
