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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class DoneTest {
  private static final Pose2d start = new Pose2d();
  private static final Pose2d end = new Pose2d(2.0, 2.0, new Rotation2d(Math.PI));

  @BeforeEach
  void setup() {
    assert HAL.initialize(500, 0);
  }

  @Test
  public void testExecution() {
    CommandScheduler scheduler = SchedulerMaker.make();

    AutoFactory factory = AutoTestHelper.factory();
    Trajectory<SwerveSample> trajectory =
        TrajectoryTestHelper.linearTrajectory("test", start, end, 3.0, SwerveSample.class);
    AutoRoutine routine = factory.newRoutine("test");
    AutoTrajectory traj = factory.trajectory(trajectory, routine, true);

    Trigger done = traj.done();
    Trigger doneDelayed = traj.done(2);
    Trigger doneFor = traj.doneFor(2);
    Trigger recentlyDone = traj.recentlyDone();

    // makes the scheduler poll the triggers every cycle
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

    scheduler.schedule(routine.cmd());
    scheduler.schedule(traj.cmd());
    scheduler.run();

    assertTrue(routine.active());
    assertTrue(traj.active());

    assertFalse(done);
    assertFalse(doneDelayed);
    assertFalse(doneFor);
    assertFalse(recentlyDone);

    SimHooks.stepTiming(1.0);
    scheduler.run();
    SimHooks.stepTiming(1.0);
    scheduler.run();
    SimHooks.stepTiming(1.05);
    scheduler.run();
    assertTrue(traj.inactive());

    assertTrue(done);
    assertTrue(done);
    assertFalse(doneDelayed);
    assertTrue(doneFor);
    assertTrue(recentlyDone);

    scheduler.run();
    assertFalse(done);
    assertFalse(doneDelayed);
    assertTrue(doneFor);
    assertTrue(recentlyDone);

    scheduler.run();
    assertFalse(done);
    assertTrue(doneDelayed);
    assertTrue(doneDelayed);
    assertTrue(doneFor);
    assertTrue(recentlyDone);

    routine.updateIdle(false); // simulating to starting a new trajectory
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
  }
}
