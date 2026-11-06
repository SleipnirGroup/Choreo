// Copyright (c) Choreo contributors

package choreo.commands3;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectoryTestHelper;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.command3.Trigger;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;

/**
 * Checks the timing of the trajectory triggers ({@code atTime}, {@code done}, {@code doneDelayed},
 * {@code doneFor} and {@code recentlyDone}) against a fixed 20ms loop.
 *
 * <p>Unlike the Commands v2 version, this test has no exact-timestamp assertions. It counts pulses
 * over time windows wide enough to be robust, and the timeline is deterministic because simulated
 * time is paused and stepped.
 */
@ResourceLock("timing")
public class DoneTest {
  private static final Pose2d start = new Pose2d();
  private static final Pose2d end = new Pose2d(2.0, 2.0, new Rotation2d(Math.PI));

  private final AtomicInteger oneSecondInFired = new AtomicInteger();
  private final AtomicInteger twoSecondInFired = new AtomicInteger();
  private final AtomicInteger doneFired = new AtomicInteger();
  private final AtomicInteger doneDelayedFired = new AtomicInteger();

  @BeforeEach
  void setUp() {
    AutoTestHelper.setUpSim();
  }

  @AfterEach
  void tearDown() {
    AutoTestHelper.tearDownSim();
  }

  private static void count(Trigger trigger, AtomicInteger counter) {
    trigger.onTrue(Command.noRequirements(coroutine -> counter.incrementAndGet()).named("Count"));
  }

  @Test
  public void testExecution() {
    Scheduler scheduler = Scheduler.getDefault();
    AutoFactory factory = AutoTestHelper.factory();
    Trajectory<SwerveSample> trajectory =
        TrajectoryTestHelper.linearTrajectory("test", start, end, 3.0, SwerveSample.class);
    AutoRoutine routine = new AutoRoutine(factory, "test") {};
    AutoTrajectory traj = factory.trajectory(trajectory, routine, true);

    Trigger oneSecondIn = traj.atTime(1.0);
    Trigger twoSecondIn = traj.atTime(2.0);
    Trigger done = traj.done();
    Trigger doneDelayed = traj.doneDelayed(2.0);
    Trigger doneFor = traj.doneFor(2.5);
    Trigger recentlyDone = traj.recentlyDone();
    // active() and inactive() make a new trigger on every call, and a new trigger only reports a
    // value once it has been polled, so keep these around from the start.
    Trigger trajActive = traj.active();
    Trigger trajInactive = traj.inactive();

    // Binding a command also makes the scheduler poll the trigger every cycle
    count(oneSecondIn, oneSecondInFired);
    count(twoSecondIn, twoSecondInFired);
    count(done, doneFired);
    count(doneDelayed, doneDelayedFired);
    doneFor.onTrue(Command.noRequirements(coroutine -> {}).named("None"));
    recentlyDone.onTrue(Command.noRequirements(coroutine -> {}).named("None"));

    // Before the routine starts nothing is active
    AutoTestHelper.stepFor(0.1);
    assertFalse(routine.active().getAsBoolean());
    assertFalse(trajActive.getAsBoolean());
    assertFalse(doneFor.getAsBoolean());
    assertFalse(recentlyDone.getAsBoolean());

    routine.start();
    var cmd = traj.cmd();
    scheduler.schedule(cmd);
    scheduler.run();
    // Triggers report the state from the last poll, which happens before commands run, so they
    // see the effects of the command starting one cycle later.
    AutoTestHelper.step();

    assertTrue(routine.active().getAsBoolean());
    assertTrue(trajActive.getAsBoolean());
    assertFalse(routine.idle().getAsBoolean(), "the routine is not idle while a trajectory runs");
    assertEquals(0, oneSecondInFired.get());
    assertEquals(0, doneFired.get());

    // 0.5s in
    AutoTestHelper.stepFor(0.5);
    assertEquals(0, oneSecondInFired.get());

    // 1.2s in: the 1s event has fired exactly once, the 2s event has not
    AutoTestHelper.stepFor(0.7);
    assertEquals(1, oneSecondInFired.get());
    assertEquals(0, twoSecondInFired.get());

    // 2.2s in
    AutoTestHelper.stepFor(1.0);
    assertEquals(1, oneSecondInFired.get(), "events fire for one cycle only");
    assertEquals(1, twoSecondInFired.get());
    assertTrue(trajActive.getAsBoolean());
    assertEquals(0, doneFired.get());

    // 3.1s in: the trajectory (3s) has finished
    AutoTestHelper.stepFor(0.9);
    assertFalse(scheduler.isScheduledOrRunning(cmd));
    assertTrue(trajInactive.getAsBoolean());
    assertTrue(routine.idle().getAsBoolean(), "the routine is idle once its trajectory ends");
    assertEquals(1, doneFired.get());
    assertEquals(0, doneDelayedFired.get(), "doneDelayed(2.0) waits two seconds");
    assertTrue(doneFor.getAsBoolean());
    assertTrue(recentlyDone.getAsBoolean());

    // done is a one cycle pulse, it does not stay high
    assertFalse(done.getAsBoolean());

    // 2.1s after finishing: doneDelayed has fired, once
    AutoTestHelper.stepFor(2.0);
    assertEquals(1, doneFired.get());
    assertEquals(1, doneDelayedFired.get());
    assertTrue(doneFor.getAsBoolean(), "doneFor(2.5) is still high at ~2.1s");
    assertTrue(recentlyDone.getAsBoolean());

    // 3.1s after finishing: doneFor(2.5) has ended, but recentlyDone lasts until a new trajectory
    AutoTestHelper.stepFor(1.0);
    assertFalse(doneFor.getAsBoolean());
    assertTrue(recentlyDone.getAsBoolean());

    // Run it again. recentlyDone ends as soon as the routine stops being idle
    var again = traj.cmd();
    scheduler.schedule(again);
    AutoTestHelper.stepFor(0.1);
    assertTrue(trajActive.getAsBoolean());
    assertFalse(routine.idle().getAsBoolean());
    assertFalse(recentlyDone.getAsBoolean());
    assertEquals(1, doneFired.get(), "done does not fire while it is running again");

    // The second run finishes and fires everything again
    AutoTestHelper.stepFor(3.2);
    assertFalse(scheduler.isScheduledOrRunning(again));
    assertTrue(trajInactive.getAsBoolean());
    assertEquals(2, doneFired.get());
    assertEquals(2, oneSecondInFired.get());
    assertEquals(2, twoSecondInFired.get());
    assertTrue(recentlyDone.getAsBoolean());

    routine.end();
    AutoTestHelper.stepFor(0.1);
    assertFalse(routine.active().getAsBoolean());
  }
}
