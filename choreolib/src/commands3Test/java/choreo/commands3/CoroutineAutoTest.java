// Copyright (c) Choreo contributors

package choreo.commands3;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectoryTestHelper;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;

/**
 * Checks the coroutine patterns the Commands v3 docs show for writing an auto, which use {@code
 * await}, {@code awaitAll}, {@code awaitAny} and {@code fork} around {@link AutoFactory} commands.
 */
@ResourceLock("timing")
public class CoroutineAutoTest {
  private static final Pose2d START = new Pose2d();
  private static final Pose2d END = new Pose2d(1.0, 0.0, new Rotation2d());

  private final Scheduler scheduler = Scheduler.getDefault();
  private final AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
  private final AtomicInteger resets = new AtomicInteger();
  private final Mechanism intakeMechanism = new Mechanism() {};
  private final AtomicBoolean intakeCancelled = new AtomicBoolean();
  private AutoFactory factory;
  private Trajectory<SwerveSample> oneSecond;

  /** Never finishes on its own, like a typical "run the intake" command. */
  private Command intake() {
    return Command.requiring(intakeMechanism)
        .executing(
            co -> {
              while (true) {
                co.yield();
              }
            })
        .whenCanceled(() -> intakeCancelled.set(true))
        .named("Intake");
  }

  /** Finishes by itself after about the given number of seconds. */
  private Command finishesAfter(double seconds) {
    return Command.noRequirements(
            co -> {
              for (int i = 0; i < seconds / AutoTestHelper.PERIOD; i++) {
                co.yield();
              }
            })
        .named("Finishes After " + seconds);
  }

  @BeforeEach
  void setUp() {
    AutoTestHelper.setUpSim();
    factory =
        new AutoFactory(
            pose::get,
            newPose -> {
              resets.incrementAndGet();
              pose.set(newPose);
            },
            (SwerveSample sample) -> pose.set(sample.getPose()),
            false,
            new Mechanism() {});
    oneSecond = TrajectoryTestHelper.linearTrajectory("one", START, END, 1.0, SwerveSample.class);
  }

  @AfterEach
  void tearDown() {
    AutoTestHelper.tearDownSim();
  }

  @Test
  void awaitAnyEndsWhenTheTrajectoryEndsAndCancelsTheIntake() {
    var finished = new AtomicBoolean();
    var intake = intake();
    var auto =
        Command.noRequirements(
                co -> {
                  co.await(factory.resetOdometry(oneSecond));
                  co.awaitAny(factory.trajectoryCmd(oneSecond), intake);
                  finished.set(true);
                })
            .named("Auto");

    scheduler.schedule(auto);
    AutoTestHelper.stepFor(0.5);
    assertFalse(finished.get(), "still driving");
    assertTrue(scheduler.isScheduledOrRunning(intake), "the intake runs alongside the trajectory");
    assertEquals(1, resets.get());

    AutoTestHelper.stepFor(1.0);
    assertTrue(finished.get(), "the auto continues once the trajectory is done");
    assertTrue(intakeCancelled.get(), "the intake that never ends is cancelled");
    assertFalse(scheduler.isScheduledOrRunning(intake));
    assertEquals(END.getX(), pose.get().getX(), 0.05, "the trajectory ran to its end");
  }

  @Test
  void awaitAllWaitsForEveryCommand() {
    var finished = new AtomicBoolean();
    var auto =
        Command.noRequirements(
                co -> {
                  co.awaitAll(factory.trajectoryCmd(oneSecond), finishesAfter(2.0));
                  finished.set(true);
                })
            .named("Auto");

    scheduler.schedule(auto);
    AutoTestHelper.stepFor(1.5);
    assertFalse(finished.get(), "the trajectory is done but the other command is not");

    AutoTestHelper.stepFor(1.0);
    assertTrue(finished.get());
  }

  @Test
  void forkedCommandsStopWhenTheParentEnds() {
    var intake = intake();
    var auto =
        Command.noRequirements(
                co -> {
                  co.fork(intake);
                  co.await(factory.trajectoryCmd(oneSecond));
                })
            .named("Auto");

    scheduler.schedule(auto);
    AutoTestHelper.stepFor(0.5);
    assertTrue(scheduler.isScheduledOrRunning(intake), "forked in the background");
    assertTrue(scheduler.isScheduledOrRunning(auto));

    AutoTestHelper.stepFor(1.0);
    assertFalse(scheduler.isScheduledOrRunning(auto));
    assertFalse(scheduler.isScheduledOrRunning(intake), "the fork does not outlive its parent");
    assertTrue(intakeCancelled.get());
  }

  @Test
  void ordinaryJavaControlFlowBranchesOnState() {
    for (boolean hasGamepiece : new boolean[] {true, false}) {
      var scored = new AtomicBoolean();
      var skipped = new AtomicBoolean();
      var auto =
          Command.noRequirements(
                  co -> {
                    co.await(factory.trajectoryCmd(oneSecond));
                    if (hasGamepiece) {
                      co.await(finishesAfter(0.1));
                      scored.set(true);
                    } else {
                      skipped.set(true);
                    }
                  })
              .named("Auto " + hasGamepiece);

      scheduler.schedule(auto);
      AutoTestHelper.stepFor(1.5);

      assertFalse(scheduler.isScheduledOrRunning(auto));
      assertEquals(hasGamepiece, scored.get());
      assertEquals(!hasGamepiece, skipped.get());
    }
  }
}
