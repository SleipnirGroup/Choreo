// Copyright (c) Choreo contributors

package choreo.auto;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectoryTestHelper;
import edu.wpi.first.hal.HAL;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj.simulation.SimHooks;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.SchedulerMaker;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

public class TrajectoryCmdTest {
  private static final Pose2d start = new Pose2d();
  private static final Pose2d end = new Pose2d(2.0, 2.0, new Rotation2d(Math.PI));

  @Test
  public void testExecution() {
    assert HAL.initialize(500, 0);
    CommandScheduler scheduler = SchedulerMaker.make();
    AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
    AutoFactory factory = AutoTestHelper.factory(false, pose);
    Trajectory<SwerveSample> trajectory =
        TrajectoryTestHelper.linearTrajectory("test", start, end, 3.0, SwerveSample.class);

    Command trajectoryCmd = factory.trajectoryCmd(trajectory);

    scheduler.schedule(trajectoryCmd);

    // trajectoryCmd should be scheduled for trajectory.getTotalTime() seconds and call the sample
    // consumer on every cycle of that duration

    SimHooks.pauseTiming();

    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.setAutonomous(true);
    DriverStationSim.notifyNewData();
    DriverStation.refreshData();
    assertTrue(DriverStation.isAutonomousEnabled());

    for (int i = 0; i < 149; i++) {
      scheduler.run();
      assertTrue(scheduler.isScheduled(trajectoryCmd));
      SimHooks.stepTiming(0.02);
    }

    SimHooks.stepTiming(0.1);
    scheduler.run();

    assertFalse(scheduler.isScheduled(trajectoryCmd));

    assertTrue(pose.get().getTranslation().getDistance(end.getTranslation()) < 0.5);

    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.setAutonomous(true);
    DriverStationSim.notifyNewData();
    DriverStation.refreshData();
    assertTrue(DriverStation.isAutonomousEnabled());

    SimHooks.resumeTiming();
  }
}
