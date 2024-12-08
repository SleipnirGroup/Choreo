
# Auto Factory (Java Only)

ChoreoLib provides the `AutoFactory` ([Java](/api/choreolib/java/choreo/auto/AutoFactory.html)) class as a higher level API to make it easier to create complex auto routines inside your robot code.

!!! note
    This API is only available for Java. C++ and Python users should instead utilize the [Trajectory API](./trajectory-api.md).

Creating an `AutoFactory` can be done using `Choreo.createAutoFactory()`. It is recommended for your `AutoFactory` to be created at the Robot scope (e.g. in the `Robot` or `RobotContainer` constructor), not in the drive subsystem.

```java title="Robot.java"
public class Robot extends TimedRobot {
    private final Drive driveSubsystem = new Drive();
    private final AutoFactory autoFactory;

    public Robot() {
        autoFactory = Choreo.createAutoFactory(
            driveSubsystem::getPose, // A function that returns the current robot pose
            driveSubsystem::followTrajectory, // The drive subsystem trajectory follower (1)
            () -> true, // If alliance flipping should be enabled (2)
            driveSubsystem, // The drive subsystem
            new AutoBindings() // An empty AutoBindings object (3)
        );
    }
}
```

1. See [Getting Started](./getting-started.md/#setting-up-the-drive-subsystem) for more details on how to implement a trajectory follower in your drive subsystem.
2. It is recommended for trajectories to be created only on the blue side of the field in the Choreo application. Enabling alliance flipping will automatically mirror trajectories to the red side of the field if the robot is on the red alliance.
3. More information about setting up `AutoBindings` can be found in the [AutoBindings](#autobindings) section of this page.

There are two ways to create autos with an `AutoFactory`: [command compositions](#using-command-compositions) or the [`AutoRoutine`](#using-autoroutine) class. For short and simple autos, command compositions may be the best choice for you. However, if your auto includes many segments, complex logic, or branching behavior, `AutoRoutine` is likely the best option.

!!! tip
    The following examples use "segmented trajectories": multiple reusable small trajectories that can be combined to create an entire autonomous sequence. You may be used to the more traditional approach of "monolithic trajectories", which is a single trajectory that spans the entire autonomous period, running from start to finish without stopping.

    Monolithic trajectories may be more cumbersome in some scenarios (*especially* for branching autos), and you may find it more difficult to inject logic in-between points of interest along a trajectory.

    With this in mind, if you don't plan on creating branching autos you can still achieve segmented trajectory behavior with a monolithic trajectory by using the "Split" checkbox on a waypoint in the Choreo application. Overloads for trajectory related methods provide an argument to define the index of these splits to fetch a trajectory segment from.

## Using Command Compositions

Command compositions is how most teams architect their autonomous routines. Typically a single `Commands.sequence()` (1), with a list of commands that define a sequential list of actions for your robot to execute during the autonomous period.
{ .annotate }

1. Your team may use a `SequentialCommandGroup` subclass

The `AutoFactory` class provides the `trajectoryCommand()` method, which creates a command that will follow the specified trajectory.

```java
// Follows deploy/choreo/myTrajectory.traj
Command myTrajectory = autoFactory.trajectoryCommand("myTrajectory");
```

!!! warning
    Trajectories are sampled using a timer, which also dictates when the command ends. This means that your robot is technically not guaranteed to finish exactly at the end of a trajectory. Properly tuning your robot's drivetrain as well as feedback gains in your trajectory follower will mitigate this error.

You can then combine trajectory commands with other functions of your robot to create an autonomous routine. For more information about command compositions, check out [WPILib's documentation](https://docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html).

```java
public Command pickupAndScoreAuto() {
    return Commands.sequence(
        // TODO Reset Odometry (Pending API change)
        Commands.deadline(
            autoFactory.trajectoryCommand("pickupGamepiece"),
            intakeSubsystem.intake() // (1)
        ),
        Commands.parallel(
            autoFactory.trajectoryCommand("scoreGamepiece"),
            scoringSubsystem.getReady()
        )
        scoringSubsystem.score()
    );
}
```

1. Throughout this documentation, we assume you are using [command factory methods](https://docs.wpilib.org/en/stable/docs/software/commandbased/organizing-command-based.html#instance-command-factory-methods) in your subsystems. For the uninitiated, this is WPILib's recommended alternative to [command subclasses](https://docs.wpilib.org/en/stable/docs/software/commandbased/organizing-command-based.html#writing-command-classes) (i.e. `new IntakeCommand()`).

## Using AutoRoutine

While command compositions may be an effective architecture in most cases, it has a tendency to become unwieldy if your autonomous routine has branches, if your subsystems use default commands, or if you want your subsystems to run independently and "hand off" actions to each other. The `AutoRoutine` ([Java](/api/choreolib/java/choreo/auto/AutoRoutine.html)) class aims to solve these problems, using WPILib's [Trigger](https://github.wpilib.org/allwpilib/docs/release/java/edu/wpi/first/wpilibj2/command/button/Trigger.html) to define a control flow based on reactions to state that don't require subsystems until they are needed.

To get started, create a new routine using `AutoFactory.newRoutine()`:

```java
// Creates a new routine with the name "exampleRoutine"
AutoRoutine routine = autoFactory.newRoutine("exampleRoutine");
```

The "entrance" to all routines is the `AutoRoutine.running()` trigger. You should bind the first command you want to execute to this trigger.

```java
routine.running().onTrue(Commands.print("Started the routine!"));
```

Trajectories can be loaded using `AutoRoutine.trajectory()`, which will return an `AutoTrajectory` ([Java](/api/choreolib/java/choreo/auto/AutoTrajectory.html)). The `AutoTrajectory` class exposes multiple triggers for you to attach reactive logic to, as well as `AutoTrajectory.cmd()` for scheduling the trajectory.

```java
public AutoRoutine pickupAndScoreAuto() {
    AutoRoutine routine = autoFactory.newRoutine("pickupAndScore");

    // Load the routine's trajectories
    AutoTrajectory pickupTraj = routine.trajectory("pickupGamepiece");
    AutoTrajectory scoreTraj = routine.trajectory("scoreGamepiece");

    // When the routine begins, start the first trajectory
    routine.running().onTrue(pickupTraj.cmd()); // TODO Reset Odometry (Pending API change)

    // Starting at the event marker named "intake", run the intake
    pickupTraj.atPose("intake").onTrue(intakeSubsystem.intake());

    // When the trajectory is done, start the next trajectory
    pickupTraj.done().onTrue(scoreTraj.cmd());

    // While the trajectory is active, prepare the scoring subsystem
    scoreTraj.active().whileTrue(scoringSubsystem.getReady());

    // When the trajectory is done, score
    scoreTraj.done().onTrue(scoringSubsystem.score());

    return routine;
}
```

Sometimes, you may want to implement a "branching auto": an autonomous routine that changes behavior based on the state of the robot. An excellent example for the need of branching autos is the [2024 season](https://youtu.be/9keeDyFxzY4), where robots would race to the midline to grab a gamepiece. If another robot beat yours to the midline, or your robot missed a game piece, a common strategy was to go directly to the next gamepiece on the midline, instead of coming back to score.

Below is an example auto routine from the 2024 season:

```java
public AutoRoutine branching2024Auto() {
    AutoRoutine routine = autoFactory.newRoutine("branching2024Auto");

    // This routine uses segments between pre-defined handoff points.
    // Expand the tooltip for information about their naming convention -> (1)

    // Load the routine's trajectories
    AutoTrajectory startToC2 = routine.trajectory("startToC2");
    AutoTrajectory C2toM1 = routine.trajectory("C2toM1");
    AutoTrajectory M1toM2 = routine.trajectory("M1toM2");
    AutoTrajectory M2toM3 = routine.trajectory("M2toM3");
    AutoTrajectory M1toScore = routine.trajectory("M1toScore");
    AutoTrajectory M2toScore = routine.trajectory("M2toScore");
    AutoTrajectory M3toScore = routine.trajectory("M3toScore");
    AutoTrajectory scoreToM2 = routine.trajectory("scoreToM2");
    AutoTrajectory scoreToM3 = routine.trajectory("scoreToM3");

    // When the routine starts, shoot the first gamepiece, then go to the "C2" location
    routine.running().onTrue(shooterSubsystem.shoot().andThen(startToC2.cmd()));

    // Pick up and shoot the gamepiece at the "C2" location, then go to the "M1" location
    startToC2.active().whileTrue(intakeSubsystem.intake());
    startToC2.done().onTrue(shooterSubsystem.shoot().andThen(C2toM1.cmd()));

    // Run the intake when we are approaching a gamepiece
    C2toM1.active()
        .or(scoreToM2.active())
        .or(scoreToM3.active())
        .or(M1toM2.active())
        .or(M2toM3.active())
        .whileTrue(intakeSubsystem.intake());

    // If we picked up the gamepiece, go to the "Score" location
    // If we didn't pick up the gamepiece, go to the next midline location
    C2toM1.done().onTrue(either(M1toScore.cmd(), M1toM2.cmd(), shooterSubsystem::hasGamepiece));
    scoreToM2.done().or(M1toM2.done()).onTrue(either(M2toScore.cmd(), M2toM3.cmd(), shooterSubsystem::hasGamepiece));
    scoreToM3.done().or(M2toM3.done()).onTrue(either(M3toScore.cmd(), Commands.none(), shooterSubsystem::hasGamepiece));

    // After we go to score, shoot then go to the next available midline location
    M1toScore.done().onTrue(shooterSubsystem.shoot().andThen(scoreToM2.cmd()));
    M2toScore.done().onTrue(shooterSubsystem.shoot().andThen(scoreToM3.cmd()));
    M3toScore.done().onTrue(shooterSubsystem.shoot());

    return routine;
}
```

1. ![Samples view layer showing ](../media/choreolib-branching-auto.png)

## AutoChooser

The `AutoChooser` ([Java](/api/choreolib/java/choreo/auto/AutoChooser.html)) class allows you to send a list of your autonomous routines to a driver dashboard for selection before a match. It is meant to be a more efficient alternative to `SendableChooser`, taking a [lazy loading](https://en.wikipedia.org/wiki/Lazy_loading) approach to generating command compositions or an `AutoRoutine`. This approach has the benefit of not loading all autos on startup, but also not loading the auto after the match starts, which may cause a delay when using many or large trajectories.

```java
// TODO Pending https://github.com/SleipnirGroup/Choreo/pull/949    
```

## AutoBindings

The `AutoBindings` ([Java](/api/choreolib/java/choreo/auto/AutoFactory.AutoBindings.html)) class is used to bind event markers in trajectories made by the `AutoFactory` to commands. This is useful if you have simpler actions that you want to trigger at specific points in a trajectory without much thought.

```java
AutoBindings bindings = new AutoBindings();
bindings.bind("intake", intakeSubsystem::intake);
bindings.bind("score", scoringSubsystem::score);
```
