// Copyright (c) Choreo contributors

package choreo.auto;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectoryTestHelper;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.driverstation.internal.DriverStationBackend;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.hardware.hal.RobotMode;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.simulation.SimHooks;

public class TrajectoryCmdTest {
  private static final Pose2d start = new Pose2d();
  private static final Pose2d end = new Pose2d(2.0, 2.0, Rotation2d.k180deg);

  @Test
  public void testExecution() {
    assert HAL.initialize(500, 0);
    Scheduler scheduler = Scheduler.createIndependentScheduler();
    AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
    AutoFactory factory = AutoTestHelper.factory(false, pose);
    Trajectory<SwerveSample> trajectory =
        TrajectoryTestHelper.linearTrajectory("test", start, end, 3.0, SwerveSample.class);

    Command trajectoryCmd = factory.trajectory(trajectory).cmd();

    scheduler.schedule(trajectoryCmd);

    // trajectoryCmd should be scheduled for trajectory.getTotalTime() seconds and call the sample
    // consumer on every cycle of that duration

    SimHooks.pauseTiming();

    updateAndAssertIsAutonomous();

    for (int i = 0; i < 149; i++) {
      scheduler.run();
      assertTrue(scheduler.isScheduled(trajectoryCmd));
      SimHooks.stepTiming(0.02);
    }

    SimHooks.stepTiming(0.1);
    scheduler.run();

    assertFalse(scheduler.isScheduled(trajectoryCmd));

    assertTrue(pose.get().getTranslation().getDistance(end.getTranslation()) < 0.5);

    updateAndAssertIsAutonomous();

    SimHooks.resumeTiming();
  }

  private void updateAndAssertIsAutonomous() {
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.setRobotMode(RobotMode.AUTONOMOUS);
    DriverStationSim.notifyNewData();
    DriverStationBackend.refreshData();
    assertTrue(DriverStationBackend.isAutonomousEnabled());
  }
}
