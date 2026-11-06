// Copyright (c) Choreo contributors

package choreo.commands3;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectoryTestHelper;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;

@ResourceLock("timing")
public class TrajectoryCmdTest {
  private static final Pose2d start = new Pose2d();
  private static final Pose2d end = new Pose2d(2.0, 2.0, Rotation2d.k180deg);

  @BeforeEach
  void setUp() {
    AutoTestHelper.setUpSim();
  }

  @AfterEach
  void tearDown() {
    AutoTestHelper.tearDownSim();
  }

  @Test
  public void testExecution() {
    Scheduler scheduler = Scheduler.getDefault();
    AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
    AutoFactory factory = AutoTestHelper.factory(false, pose);
    Trajectory<SwerveSample> trajectory =
        TrajectoryTestHelper.linearTrajectory("test", start, end, 3.0, SwerveSample.class);

    Command trajectoryCmd = factory.trajectoryCmd(trajectory);

    scheduler.schedule(trajectoryCmd);

    // trajectoryCmd should be scheduled for trajectory.getTotalTime() seconds and call the sample
    // consumer on every cycle of that duration
    for (int i = 0; i < 149; i++) {
      scheduler.run();
      assertTrue(scheduler.isScheduledOrRunning(trajectoryCmd), "still running on cycle " + i);
      AutoTestHelper.step();
    }

    // Past the end of the trajectory
    AutoTestHelper.stepFor(0.1);

    assertFalse(scheduler.isScheduledOrRunning(trajectoryCmd));

    // The command sends the final sample when it finishes
    assertTrue(pose.get().getTranslation().getDistance(end.getTranslation()) < 0.5);
  }

  @Test
  public void testCommandCanBeCancelled() {
    Scheduler scheduler = Scheduler.getDefault();
    AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
    AutoFactory factory = AutoTestHelper.factory(false, pose);
    Trajectory<SwerveSample> trajectory =
        TrajectoryTestHelper.linearTrajectory("test", start, end, 3.0, SwerveSample.class);

    Command trajectoryCmd = factory.trajectoryCmd(trajectory);
    scheduler.schedule(trajectoryCmd);
    AutoTestHelper.stepFor(1.0);
    assertTrue(scheduler.isScheduledOrRunning(trajectoryCmd));

    scheduler.cancel(trajectoryCmd);
    assertFalse(scheduler.isScheduledOrRunning(trajectoryCmd));

    // An interrupted trajectory does not jump to its final sample
    assertTrue(pose.get().getTranslation().getDistance(end.getTranslation()) > 0.5);
  }
}
