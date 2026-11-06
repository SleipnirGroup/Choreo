// Copyright (c) Choreo contributors

package choreo.commands3;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.trajectory.TrajectoryTestHelper;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
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
import org.wpilib.command3.Trigger;
import org.wpilib.driverstation.internal.DriverStationBackend;
import org.wpilib.framework.OpModeRobot;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.hardware.hal.OpModeOption;
import org.wpilib.hardware.hal.RobotMode;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.simulation.SimHooks;

/**
 * Runs {@link AutoRoutine}s as autonomous opmodes in a simulated robot, selecting and enabling them
 * through the simulated Driver Station like a real match would.
 */
@ResourceLock("timing")
class AutoRoutineSimTest {
  private static final double PERIOD = 0.02;
  private static final double TRAJECTORY_SECONDS = 1.0;
  private static final Pose2d START = new Pose2d();
  private static final Pose2d END = new Pose2d(1.0, 0.0, new Rotation2d());
  private static final Trajectory<SwerveSample> TRAJECTORY =
      TrajectoryTestHelper.linearTrajectory(
          "test", START, END, TRAJECTORY_SECONDS, SwerveSample.class);

  /** A robot that runs the default scheduler every loop, like a real Commands v3 robot. */
  public static class TestRobot extends OpModeRobot {
    final List<SwerveSample> samples = new CopyOnWriteArrayList<>();
    final AtomicReference<Pose2d> odometry = new AtomicReference<>(new Pose2d());
    final AtomicInteger resets = new AtomicInteger();
    final AutoFactory factory =
        new AutoFactory(
            odometry::get,
            pose -> {
              resets.incrementAndGet();
              odometry.set(pose);
            },
            (SwerveSample sample) -> samples.add(sample),
            false,
            new Mechanism() {});

    final AtomicInteger subclassBuilt = new AtomicInteger();

    @Override
    public void robotPeriodic() {
      Scheduler.getDefault().run();
    }
  }

  /** A routine defined as its own opmode class. */
  public static class SubclassRoutine extends AutoRoutine {
    public SubclassRoutine(TestRobot robot) {
      super(robot.factory, "Subclass");
      robot.subclassBuilt.incrementAndGet();
      var traj = trajectory(TRAJECTORY);
      active().onTrue(traj.cmd());
    }
  }

  private TestRobot robot;
  private Thread robotThread;

  private static long opModeId(String name) {
    return OpModeOption.makeId(RobotMode.AUTONOMOUS, name.hashCode());
  }

  @BeforeEach
  void setUp() {
    assertTrue(HAL.initialize(), "HAL failed to initialize");
    SimHooks.pauseTiming();
    SimHooks.setProgramStarted(false);
    DriverStationSim.resetData();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(false);
    robot = new TestRobot();
  }

  @AfterEach
  void tearDown() throws InterruptedException {
    if (robotThread != null) {
      robot.endCompetition();
      robotThread.join();
    }
    robot.close();
    Scheduler.getDefault().cancelAll();
    DriverStationBackend.clearOpModes();
    SimHooks.resumeTiming();
  }

  private void startRobot() {
    robot.publishOpModes();
    robotThread = new Thread(robot::startCompetition);
    robotThread.start();
    SimHooks.waitForProgramStart();
  }

  private void select(String name) {
    DriverStationSim.setRobotMode(RobotMode.AUTONOMOUS);
    DriverStationSim.setOpMode(opModeId(name));
    DriverStationSim.notifyNewData();
    SimHooks.stepTiming(PERIOD);
  }

  private void deselect() {
    DriverStationSim.setEnabled(false);
    DriverStationSim.setOpMode(0);
    DriverStationSim.notifyNewData();
    SimHooks.stepTiming(2 * PERIOD);
  }

  private void enable() {
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();
    SimHooks.stepTiming(PERIOD);
  }

  private void runFor(double seconds) {
    int steps = (int) Math.ceil(seconds / PERIOD);
    for (int i = 0; i < steps; i++) {
      SimHooks.stepTiming(PERIOD);
    }
  }

  @Test
  void routineIsBuiltOnlyWhenSelected() {
    var built = new AtomicInteger();
    robot.factory.addRoutine(robot, "Lazy", routine -> built.incrementAndGet());
    startRobot();
    assertEquals(0, built.get(), "the body must not run at registration");

    select("Lazy");
    assertEquals(1, built.get(), "the body runs once when the opmode is selected");

    // A fresh routine is built every time the opmode is selected again
    deselect();
    select("Lazy");
    assertEquals(2, built.get());
  }

  @Test
  void selectedRoutineFollowsTrajectoryAndFinishes() {
    var done = new AtomicInteger();
    robot.factory.addRoutine(
        robot,
        "Follow",
        routine -> {
          var traj = routine.trajectory(TRAJECTORY);
          routine.active().onTrue(traj.resetOdometry().andThen(traj.cmd()).withAutomaticName());
          traj.done()
              .onTrue(Command.noRequirements(coroutine -> done.incrementAndGet()).named("Done"));
        });
    startRobot();

    select("Follow");
    runFor(0.5);
    assertTrue(robot.samples.isEmpty(), "nothing runs until the opmode is enabled");
    assertEquals(0, done.get());

    enable();
    runFor(TRAJECTORY_SECONDS + 0.5);

    assertEquals(1, robot.resets.get(), "odometry resets once, at the start");
    assertFalse(robot.samples.isEmpty(), "the controller received samples");
    var last = robot.samples.getLast();
    assertEquals(END.getX(), last.x, 0.05, "the trajectory ran to its end");
    assertEquals(1, done.get(), "done() fires exactly once");
  }

  @Test
  void subclassRoutineRunsAsOpMode() {
    robot.addOpMode(RobotMode.AUTONOMOUS, "Subclass", SubclassRoutine.class);
    startRobot();
    assertEquals(0, robot.subclassBuilt.get(), "not constructed until selected");

    select("Subclass");
    assertEquals(1, robot.subclassBuilt.get());

    enable();
    runFor(TRAJECTORY_SECONDS + 0.5);
    assertFalse(robot.samples.isEmpty());
    assertEquals(END.getX(), robot.samples.getLast().x, 0.05);
  }

  @Test
  void triggersCreatedByTheRoutineAreScopedToItsOpMode() {
    var flag = new AtomicBoolean(false);
    var fired = new AtomicInteger();
    robot.factory.addRoutine(
        robot,
        "Scoped",
        routine -> {
          // A plain Trigger the library knows nothing about. Only opmode scoping can clean it up.
          new Trigger(flag::get)
              .onTrue(Command.noRequirements(coroutine -> fired.incrementAndGet()).named("Fire"));
        });
    startRobot();

    select("Scoped");
    enable();
    flag.set(true);
    runFor(0.1);
    assertEquals(1, fired.get(), "the binding works while the opmode is selected");

    // Deselect the opmode, then toggle the condition. The binding must be gone.
    deselect();
    flag.set(false);
    runFor(0.1);
    flag.set(true);
    runFor(0.1);
    assertEquals(1, fired.get(), "the binding must not outlive the opmode");
  }

  /** Control for the scoping test: the same trigger made outside any opmode is never removed. */
  @Test
  void triggersCreatedOutsideAnOpModeAreNotScoped() {
    var flag = new AtomicBoolean(false);
    var fired = new AtomicInteger();
    robot.factory.addRoutine(robot, "Other", routine -> {});
    // Created in the test body, with no opmode selected, like in a robot constructor
    new Trigger(flag::get)
        .onTrue(Command.noRequirements(coroutine -> fired.incrementAndGet()).named("Fire"));
    startRobot();

    select("Other");
    enable();
    flag.set(true);
    runFor(0.1);
    assertEquals(1, fired.get());

    deselect();
    flag.set(false);
    runFor(0.1);
    flag.set(true);
    runFor(0.1);
    assertEquals(2, fired.get(), "an unscoped binding keeps firing after the opmode ends");
  }

  @Test
  void trajectoryStopsWhenTheRobotIsDisabled() {
    robot.factory.addRoutine(
        robot,
        "Disable",
        routine -> {
          var traj = routine.trajectory(TRAJECTORY);
          routine.active().onTrue(traj.cmd());
        });
    startRobot();

    select("Disable");
    enable();
    runFor(0.3);
    assertFalse(robot.samples.isEmpty(), "the trajectory started");

    DriverStationSim.setEnabled(false);
    DriverStationSim.notifyNewData();
    runFor(0.1);
    int countAfterDisable = robot.samples.size();
    runFor(0.5);
    assertEquals(
        countAfterDisable, robot.samples.size(), "no samples are sent after the robot is disabled");
  }
}
