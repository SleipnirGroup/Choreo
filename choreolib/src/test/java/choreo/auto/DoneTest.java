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
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SchedulerMaker;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import org.junit.jupiter.api.Test;

public class DoneTest {
  private static final Pose2d start = new Pose2d();
  private static final Pose2d end = new Pose2d(2.0, 2.0, new Rotation2d(Math.PI));

  @Test
  public void testExecution() {
    assert HAL.initialize(500, 0);
    CommandScheduler scheduler = SchedulerMaker.make();

    AutoFactory factory = AutoTestHelper.factory();
    Trajectory<SwerveSample> trajectory =
        TrajectoryTestHelper.linearTrajectory("test", start, end, 3.0, SwerveSample.class);
    AutoRoutine routine = factory.newRoutine("test");
    AutoTrajectory traj = factory.trajectory(trajectory, routine, true);

    Trigger oneSecondIn = traj.atTime(1.0);
    Trigger twoSecondIn = traj.atTime(2.0);

    Trigger done = traj.done();
    Trigger doneDelayed = traj.doneDelayed(2.0);
    Trigger doneFor = traj.doneFor(2.5);
    Trigger recentlyDone = traj.recentlyDone();

    // makes the scheduler poll the triggers every cycle
    oneSecondIn.onTrue(Commands.none());
    twoSecondIn.onTrue(Commands.none());
    done.onTrue(Commands.none());
    doneDelayed.onTrue(Commands.none());
    doneFor.onTrue(Commands.none());
    recentlyDone.onTrue(Commands.none());

    SimHooks.pauseTiming();

    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.setAutonomous(true);
    DriverStationSim.notifyNewData();
    DriverStation.refreshData();
    assertTrue(DriverStation.isAutonomousEnabled());

    assertFalse(oneSecondIn);
    assertFalse(twoSecondIn);
    assertFalse(done);
    assertFalse(doneDelayed);
    assertFalse(doneFor);
    assertFalse(recentlyDone);

    scheduler.schedule(routine.cmd());
    scheduler.schedule(traj.cmd());
    scheduler.run();

    assertTrue(routine.active());
    assertTrue(traj.active());

    assertFalse(oneSecondIn);
    assertFalse(twoSecondIn);
    assertFalse(done);
    assertFalse(doneDelayed);
    assertFalse(doneFor);
    assertFalse(recentlyDone);

    SimHooks.stepTiming(1.0);
    scheduler.run();
    assertTrue(oneSecondIn);
    assertTrue(oneSecondIn);
    assertFalse(twoSecondIn);
    SimHooks.stepTiming(1.1);
    scheduler.run();
    assertFalse(oneSecondIn);
    assertTrue(twoSecondIn);
    SimHooks.stepTiming(1.05);
    scheduler.run();
    assertTrue(traj.inactive());

    assertTrue(done);
    assertFalse(doneDelayed);
    assertTrue(doneFor);
    assertTrue(recentlyDone);
    SimHooks.stepTiming(0.2);
    assertTrue(done);

    SimHooks.stepTiming(1.0);
    scheduler.run();
    assertFalse(done);
    assertFalse(doneDelayed);
    assertTrue(doneFor);
    assertTrue(recentlyDone);

    SimHooks.stepTiming(1.0);
    scheduler.run();
    assertFalse(done);
    assertTrue(doneDelayed);
    assertTrue(doneDelayed);
    assertTrue(doneFor);
    assertTrue(recentlyDone);

    routine.updateIdle(false); // simulating to starting a new trajectory
    SimHooks.stepTiming(1.0);
    scheduler.run();
    assertFalse(doneFor);
    assertFalse(recentlyDone);

    // test re-running a trajectory
    scheduler.schedule(traj.cmd());
    scheduler.run();

    assertTrue(routine.active());
    assertTrue(traj.active());

    SimHooks.stepTiming(2.0);
    scheduler.run();
    scheduler.run();
    SimHooks.stepTiming(1.05);
    scheduler.run();

    assertTrue(traj.inactive());
    assertTrue(done);

    SimHooks.resumeTiming();

    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.setAutonomous(true);
    DriverStationSim.notifyNewData();
    DriverStation.refreshData();
    assertTrue(DriverStation.isAutonomousEnabled());
  }
}
