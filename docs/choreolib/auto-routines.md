# Auto Routines

ChoreoLib provides the `AutoFactory` class as higher level API to make it easier to create competitive and complex auto routines inside your robot code.

## Triggers vs Composition

Composition is how most teams currently architect their auto routines.
You start with 1 `SequentialCommandGroup` and add commands to it.
This works for many use cases but can get unwieldy when you have branches,
want your subsystem default command to run during an auto
or want to have concurrent command groups running independently that might handoff `Subsystems` to each other.

Triggers aim to solve these problems by providing a way to define a control flow based on reactions to state
that don't allocate `Subsystems` until they are needed. Triggers also allow a non-linear control flow with
branching supported in a first class manner.

## Monolithic vs Segmented Trajectories

Monolithic trajectories are a single trajectory that is run from start to finish without stopping.
This has the advantage of being simple to create and understand but can be limiting in complex autos that may require
branching. Making a new auto with this method can be time consuming as you have to create a completely new trajectory
for each new auto and are likely repeating yourself.

Segmented trajectories are a series of smaller trajectories that have defined handoff positions to smoothly transition
between them. This allows for more complex autos to be created by reusing smaller pieces of trajectories and combining
them in different ways. This can be more complex to create but can be more powerful and flexible in the long run. If every
command is named aswell it is easier to debug and understand what is happening in the auto opposed to a monolithic command group.

## Example Preamble

For the following examples we will be working on a 2024 robot similar to [1678 2024](https://www.statbotics.io/team/1678/2024).

There are already some helper methods in scope to allow us to use commands easier.
- `intake` - Extends the intake, ends when a note is acquired and automatically retracts when the command ends.
Uses the `Intake` `Subsystem`.
- `retractIntake` - Retracts the intake.
Uses the `Intake` `Subsystem`.
- `shootIfGp` - Shoots the note if the robot has one.
Uses the `Shooter` `Subsystem`.
- `aimFor(Pose2d pose)` - Aims the shooter for a specific position, also keeps the wheels spunup.
Uses the `Shooter` `Subsystem`.
- `spinnup` - Spins up the shooter wheels.
Uses the `Shooter` `Subsystem`.
- `aim` - Aims the shooter based on the current odometry position.
Uses the `Shooter` `Subsystem`.
- `resetOdometry(Pose2d pose)` - Resets the odometry to a specific position.
Uses the `Drive` `Subsystem`.
- `autoAimAndShoot` - Aims the shooter and rotates the robot to the correct angle to shoot and then shoots.
Uses the `Shooter` and `Drive` `Subsystem`.

There is also a method to make a trigger that represents if the robot owns a note.
- `yeGp(AutoLoop loop)` - Returns a trigger that is true if the robot owns a note.
- `noGp(AutoLoop loop)` - Returns a trigger that is true if the robot does not own a note.

Also assume a `import static edu.wpi.first.wpilibj2.command.Commands.*` is in scope.

## Creating an auto routine with triggers and a segmented trajectory

```java
public Command fivePieceAutoTriggerSeg(AutoFactory factory) {
  final AutoLoop loop = factory.newLoop("fivePieceAuto");

  // This uses segments that all have predefined handoff points.
  // These handoff points follow a naming convention
  // C1, C2, C3: The 3 close notes, C1 having the greatest y value
  // M1, M2, M3, M4, M5: The 5 middle notes, M1 having the greatest y value
  // S1, S2, S3: 3 arbitrary shooting positions that are near the stage, S1 having the greatest y
  // value
  // AMP, SUB, SRC: The 3 starting positions

  // Try to load all the trajectories we need
  final AutoTrajectory ampToC1 = factory.trajectory("ampToC1", loop);
  final AutoTrajectory c1ToM1 = factory.trajectory("c1ToM1", loop);
  final AutoTrajectory m1ToS1 = factory.trajectory("m1ToS1", loop);
  final AutoTrajectory m1ToM2 = factory.trajectory("m1ToM2", loop);
  final AutoTrajectory m2ToS1 = factory.trajectory("m2ToS2", loop);
  final AutoTrajectory s1ToC2 = factory.trajectory("s1ToC2", loop);
  final AutoTrajectory c2ToC3 = factory.trajectory("c2ToC3", loop);

  // entry point for the auto
  // resets the odometry to the starting position,
  // then shoots the starting note,
  // then runs the trajectory to the first close note while extending the intake
  loop.enabled()
      .onTrue(
          resetOdometry(
                  ampToC1
                      .getInitialPose()
                      .orElseGet(
                          () -> {
                            loop.kill();
                            return new Pose2d();
                          }))
              .andThen(
                  autoAimAndShoot(),
                  race(
                      intake(),
                      ampToC1.cmd(),
                      aimFor(ampToC1.getFinalPose().orElseGet(Pose2d::new))))
              .withName("fivePieceAuto entry point"));

  // spinnup the shooter while no other command is running
  loop.enabled().whileTrueDefault(spinnup());

  // shoots the note if the robot has it, then runs the trajectory to the first middle note
  ampToC1.done().onTrue(shootIfGp()).onTrue(c1ToM1.cmd().after(noGp(loop)));

  // extends the intake while traveling towards the first middle note
  // if the robot has the note, it goes back to shoot it,
  // otherwise it goes to the next middle note
  c1ToM1.atTime("intake").onTrue(intake());
  c1ToM1.done().and(yeGp(loop)).onTrue(m1ToS1.cmd());
  c1ToM1.done().and(noGp(loop)).onTrue(m1ToM2.cmd());

  // aims the shooter while traveling to shoot
  m1ToS1.active().whileTrue(aimFor(m1ToS1.getFinalPose().orElseGet(Pose2d::new)));
  m1ToS1.done().onTrue(shootIfGp());
  m1ToS1.done().onTrue(m1ToM2.cmd().after(noGp(loop)));

  // extends the intake while traveling towards the second middle note
  // go back to shoot no matter what
  m1ToM2.active().whileTrue(intake());
  m1ToM2.done().onTrue(m2ToS1.cmd());

  // aims the shooter while traveling to shoot
  m2ToS1.active().whileTrue(aimFor(m2ToS1.getFinalPose().orElseGet(Pose2d::new)));
  m2ToS1.done().onTrue(shootIfGp());
  m2ToS1.done().onTrue(s1ToC2.cmd().after(noGp(loop)));

  // extends the intake while traveling towards the second close note
  // if the robot has the note, it shoots it
  // otherwise it goes to the third close note
  s1ToC2.active().whileTrue(intake());
  s1ToC2.active().whileTrue(aimFor(s1ToC2.getFinalPose().orElseGet(Pose2d::new)));
  s1ToC2.done().onTrue(shootIfGp());
  s1ToC2.done().onTrue(c2ToC3.cmd().after(noGp(loop)));

  // extends the intake while traveling towards the third close note
  // if the robot has the note, it shoots it
  c2ToC3.active().whileTrue(intake());
  c2ToC3.done().onTrue(shootIfGp());

  return loop.cmd();
}
```

## Creating an auto routine with composition and a monolithic trajectory

```java
public Command fivePieceAutoTriggerMono(AutoFactory factory) {
  final AutoLoop loop = factory.newLoop("fivePieceAuto");

  final AutoTrajectory trajectory = factory.trajectory("fivePieceAuto", loop);

  // entry point for the auto
  // resets the odometry to the starting position,
  // then shoots the starting note,
  // then runs the trajectory to the first close note while extending the intake
  loop.enabled()
      .onTrue(
          resetOdometry(
                  trajectory.getInitialPose()
                      .orElseGet(
                          () -> {
                            loop.kill();
                            return new Pose2d();
                          }))
              .andThen(autoAimAndShoot(), trajectory.cmd())
              .withName("fivePieceAuto entry point"));

  // spinnup the shooter while no other command is running
  loop.enabled().whileTrueDefault(spinnup());

  // extends the intake when the intake event marker is reached
  trajectory.atTime("intake").onTrue(intake());
  // shoots the note when the shoot event marker is reached
  trajectory.atTime("shoot").onTrue(shootIfGp());

  // aims the shooter when the aim event marker is reached,
  // the aim command aims based on the next shoot event marker position
  final AtomicInteger shootIndex = new AtomicInteger(0);
  final Pose2d[] shootPositions = trajectory.collectEventPoses("shoot");
  trajectory.atTime("aim")
      .onTrue(defer(() -> aimFor(shootPositions[shootIndex.getAndIncrement()]), Set.of(shooter)));

  return loop.cmd().beforeStarting(() -> shootIndex.set(0)).withName("fivePieceAuto");
}
```

## Creating an auto routine with composition and a segmented trajectory

```java

public Command fivePieceAutoCompositionSeg(AutoFactory factory) {
  // This uses segments that all have predefined handoff points.
  // These handoff points follow a naming convention
  // C1, C2, C3: The 3 close notes, C1 having the greatest y value
  // M1, M2, M3, M4, M5: The 5 middle notes, M1 having the greatest y value
  // S1, S2, S3: 3 arbitrary shooting positions that are near the stage, S1 having the greatest y
  // value
  // AMP, SUB, SRC: The 3 starting positions

  // Try to load all the trajectories we need
  final AutoTrajectory ampToC1 = factory.trajectory("ampToC1", factory.voidLoop());
  final Command c1ToM1 = factory.trajectoryCommand("c1ToM1");
  final Command m1ToS1 = factory.trajectoryCommand("m1ToS1");
  final Command m1ToM2 = factory.trajectoryCommand("m1ToM2");
  final Command m2ToS1 = factory.trajectoryCommand("m2ToS2");
  final Command s1ToC2 = factory.trajectoryCommand("s1ToC2");
  final Command c2ToC3 = factory.trajectoryCommand("c2ToC3");

  Pose2d startingPose;
  if (ampToC1.getInitialPose().isPresent()) {
    startingPose = ampToC1.getInitialPose().get();
  } else {
    return none();
  }

  return sequence(
          resetOdometry(startingPose),
          autoAimAndShoot(),
          deadline(
              ampToC1.cmd(), intake(), aimFor(ampToC1.getFinalPose().orElseGet(Pose2d::new))),
          shootIfGp(),
          deadline(c1ToM1, waitSeconds(0.35).andThen(intake())),
          new ConditionalCommand(
              deadline(m1ToS1, aim()).andThen(shootIfGp()),
              deadline(m1ToM2, intake()).andThen(deadline(m2ToS1, aim()), shootIfGp()),
              yeGp() // if you aren't using the triggers API these wouldn't need a custom loop
              ),
          deadline(s1ToC2, intake(), aim()),
          shootIfGp(),
          deadline(c2ToC3, intake(), spinnup()),
          shootIfGp())
      .withName("fivePieceAuto");
}
```

## Creating an auto routine with composition and a monolithic trajectory

```java
// Don't do this
```
