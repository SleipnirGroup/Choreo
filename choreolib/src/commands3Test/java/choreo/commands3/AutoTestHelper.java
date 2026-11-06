// Copyright (c) Choreo contributors

package choreo.commands3;

import static org.junit.jupiter.api.Assertions.assertTrue;

import choreo.trajectory.SwerveSample;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.driverstation.Alliance;
import org.wpilib.hardware.hal.AllianceStationID;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.simulation.SimHooks;

public class AutoTestHelper {
  /** The length of one simulated robot loop. */
  public static final double PERIOD = 0.02;

  public static AutoFactory factory(
      boolean useAllianceFlipping, AtomicReference<Pose2d> robotPose) {
    return new AutoFactory(
        () -> robotPose.get(),
        newPose -> robotPose.set(newPose),
        (SwerveSample sample) -> robotPose.set(sample.getPose()),
        useAllianceFlipping,
        new Mechanism() {},
        (sample, isStart) -> {});
  }

  public static AutoFactory factory(boolean useAllianceFlipping) {
    return factory(useAllianceFlipping, new AtomicReference<>(new Pose2d()));
  }

  public static AutoFactory factory() {
    return factory(false);
  }

  public static void setAlliance(Optional<Alliance> alliance) {
    var id =
        alliance
            .map(
                all -> {
                  if (all.equals(Alliance.BLUE)) {
                    return AllianceStationID.BLUE_1;
                  } else {
                    return AllianceStationID.RED_1;
                  }
                })
            .orElse(AllianceStationID.UNKNOWN);
    DriverStationSim.setAllianceStationId(id);
    DriverStationSim.notifyNewData();
  }

  /** Sets up a paused, enabled, autonomous simulated robot with no opmode selected. */
  public static void setUpSim() {
    assertTrue(HAL.initialize(), "HAL failed to initialize");
    SimHooks.pauseTiming();
    DriverStationSim.resetData();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.setAllianceStationId(AllianceStationID.BLUE_1);
    DriverStationSim.notifyNewData();
  }

  /** Undoes {@link #setUpSim()}, and cancels anything left running on the default scheduler. */
  public static void tearDownSim() {
    Scheduler.getDefault().cancelAll();
    SimHooks.resumeTiming();
  }

  /**
   * Advances simulated time by one robot loop and runs the default scheduler, which also polls all
   * triggers.
   */
  public static void step() {
    SimHooks.stepTiming(PERIOD);
    Scheduler.getDefault().run();
  }

  /**
   * Steps the simulated robot for at least the given number of seconds.
   *
   * @param seconds How long to run for.
   */
  public static void stepFor(double seconds) {
    int steps = (int) Math.ceil(seconds / PERIOD);
    for (int i = 0; i < steps; i++) {
      step();
    }
  }
}
