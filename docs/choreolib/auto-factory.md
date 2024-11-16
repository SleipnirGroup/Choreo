
# AutoFactory

ChoreoLib provides the `AutoFactory` class as a higher level API to make it easier to create complex auto routines inside your robot code.

## Basic Usage

You can set up the `AutoFactory` by calling `Choreo.createAutoFactory`.
The `AutoFactory` is recommended to be created in the robot class constructor instead of the drive subsystem.

```java
// The most basic usage of the AutoFactory
class Robot extends TimedRobot {
  /** A swerve drive subsystem */
  private final Drive drive = ...;
  /** An object that manages information about robot position */
  private final Localizer localizer = ...;
  private final AutoFactory autoFactory;

  public Robot() {
    autoFactory = Choreo.createAutoFactory(
      drive, // The drive subsystem
      localizer::pose, // A function that returns the current robot pose
      drive::choreoController, // The controller for the drive subsystem
      this::isRedAlliance, // A function that returns true if the robot is on the red alliance
      new AutoBindings() // An empty `AutoBindings` object, you can learn more below
    );
  }

  public void autonomousInit() {
    // Running just the movement of a specific trajectory
    autoFactory.trajectoryCommand("myTrajectory").schedule();
  }

  private boolean isRedAlliance() {
    return DriverStation.getAlliance().orElseGet(() -> Alliance.Blue).equals(Alliance.Red);
  }
}
```

You can learn more about `drive::choreoController` in the [AutoController](./auto-controller.md) documentation.


## Using AutoChooser, AutoRoutine, and AutoTrajectory

The `AutoFactory` can create `AutoRoutine` and `AutoTrajectory` objects that can be used to create complex auto routines.
The `AutoChooser` provides a simple API to structure your auto routine creation in the most performant way.
`AutoChooser` only creates the `AutoRoutine` on dashboard chooser selection, which prevents loading all routines on boot,
increasing startup times and preventing the routines from being generated on auto start causing a delay.

For a more advanced example of creating `AutoRoutine` see the [AutoRoutine](./auto-routines.md) documentation.

```java
// Picking up where the last example left off
public Robot extends TimedRobot {
  ... //fields from previous example
  /** A subsystem that controls the intake */
  private final Intake intake = ...;
  /** A subsystem that controls the shooter */
  private final Shooter shooter = ...;
  private final AutoChooser autoChooser;

  public Robot() {
    ... //code from previous example
    autoChooser = new AutoChooser(autoFactory, "");
    autoChooser.addRoutine("twoPieceAuto", this::twoPieceAuto);
  }

  // this would normally be in a separate file
  private AutoRoutine twoPieceAuto(AutoFactory factory) {
    final AutoRoutine routine = factory.newRoutine("twoPieceAuto");

    final AutoTrajectory trajectory = factory.trajectory("twoPieceAuto", routine);

    routine.running()
        .onTrue(
            drive.resetOdometry(
                    trajectory.getInitialPose()
                        .orElseGet(
                            () -> {
                              routine.kill();
                              return new Pose2d();
                            }))
                .andThen(trajectory.cmd())
                .withName("twoPieceAuto entry point"));

    trajectory.atTime("intake").onTrue(intake.extend());
    trajectory.atTime("shoot").onTrue(shooter.launch());

    return routine;
  }

  public void autonomousInit() {
    autoChooser.getSelectedAutoRoutine().schedule();
  }
}
```

## AutoBindings

`AutoBindings` is used to bind event markers in trajectories made by the `AutoFactory` to commands.
This is useful if you have simpler actions that you want to trigger at specific points in a trajectory
without much thought from the user code side.

```java
AutoBindings makeAutoBindings() {
  AutoBindings bindings = new AutoBindings();
  bindings.bind("intake", intake::extend);
  bindings.bind("shoot", shooter::launch);
  return bindings;
}
```
