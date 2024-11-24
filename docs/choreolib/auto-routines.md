# Auto Routines

## Triggers vs Composition

Composition is how most teams currently architect their auto routines.
You start with one `SequentialCommandGroup` and add commands to it.
This works for many use cases but can get unwieldy when you have branches,
want your subsystem default command to run during an auto, or want to have
concurrent command groups running independently that might hand off `Subsystems` to each other.

Triggers aim to solve these problems by providing a way to define a control flow based on reactions to state
that don't require `Subsystems` until they are needed.

Triggers and composition can be used together to create complex auto routines.
Both paradigms also support branching in their own way.

!!! warning
    Triggers can have "hygiene" issues if not used correctly.
    Triggers that are polled by the `CommandScheduler` should never
    be on the left-hand side of a `and`/`or` method call.
    This will leak the trigger outside of the auto routine and can cause
    unexpected behavior. For example, this can cause a check intended for intaking
    a game piece during an auto to also be checked and reacted to during teleop.

## Monolithic vs Segmented Trajectories

Monolithic trajectories are based around a single trajectory that is run from start to finish without stopping.
This strategy is simpler to create and understand but can be limiting in complex autos that may require
branching. Making a new auto with this method can be time-consuming as you have to create a completely new trajectory
for each new auto and likely repeat yourself for each trajectory.

Segmented trajectories break down complex autonomous routines into smaller, reusable trajectories with defined transition points between them. This method allows for more complex autos to be created by reusing smaller pieces of trajectories and combining
them in different ways. This can be more complex to create but can be more powerful and flexible in the long run. In addition, if  each command is clearly named, it is easier to debug and understand what is happening in the auto as opposed to a monolithic command group.

## Example Preamble

For the following examples we will be working on a 2024 robot similar to [1678 2024](https://www.statbotics.io/team/1678/2024).

There are already some helper methods in scope that return commands for utility:

- `intake` - Extends the intake, ends when a note is acquired and automatically retracts when the command ends.
Uses the `Intake` `Subsystem`.
- `retractIntake` - Retracts the intake.
Uses the `Intake` `Subsystem`.
- `shootIfNoteOwned` - Shoots the note if the robot owns a note.
Uses the `Shooter` `Subsystem`.
- `aimFor(Pose2d pose)` - Aims the shooter for a specific position, also keeps the wheels spun up.
Uses the `Shooter` `Subsystem`.
- `spinnup` - Spins up the shooter wheels.
Uses the `Shooter` `Subsystem`.
- `aim` - Aims the shooter based on the current odometry position.
Uses the `Shooter` `Subsystem`.
- `resetOdometry(Pose2d pose)` - Resets the odometry to a specific position.
Uses the `Drive` `Subsystem`.
- `autoAimAndShoot` - Aims the shooter and rotates the robot to the correct angle to shoot and then shoots.
Uses the `Shooter` and `Drive` `Subsystem`.

There are also two methods that return a trigger that represents if the robot owns a note:

- `noteOwned(AutoRoutine routine)` - Returns a trigger that is true if the robot owns a note.
- `noteNotOwned(AutoRoutine routine)` - Returns a trigger that is true if the robot does not own a note.

There is also a trigger that represents if subsystems are available to be scheduled on:

- `subsystemsAvailable(AutoRoutine routine, Set<Subsystem> subsystems)` - Returns a trigger that is true if the subsystems are available to be scheduled on.

These examples also assume that a `import static edu.wpi.first.wpilibj2.command.Commands.*` is in scope.

### Creating an auto routine with triggers and a segmented trajectory

```java
public AutoRoutine fivePieceAutoTriggerSeg(AutoFactory factory) {
  final AutoRoutine routine = factory.newRoutine("fivePieceAuto");

  // This uses segments that all have predefined handoff points.
  // These handoff points follow a naming convention
  // C1, C2, C3: The 3 close notes, C1 having the greatest y value
  // M1, M2, M3, M4, M5: The 5 middle notes, M1 having the greatest y value
  // S1, S2, S3: 3 arbitrary shooting positions that are near the stage, S1 having the greatest y
  // value
  // AMP, SUB, SRC: The 3 starting positions

  // Try to load all the trajectories we need
  final AutoTrajectory ampToC1 = factory.trajectory("ampToC1", routine);
  final AutoTrajectory c1ToM1 = factory.trajectory("c1ToM1", routine);
  final AutoTrajectory m1ToS1 = factory.trajectory("m1ToS1", routine);
  final AutoTrajectory m1ToM2 = factory.trajectory("m1ToM2", routine);
  final AutoTrajectory m2ToS1 = factory.trajectory("m2ToS2", routine);
  final AutoTrajectory s1ToC2 = factory.trajectory("s1ToC2", routine);
  final AutoTrajectory c2ToC3 = factory.trajectory("c2ToC3", routine);

  final var initialPose = ampToC1.getInitialPose();
  if (initialPose.isEmpty()) {
      new Alert("Error: 5 piece auto has no starting pose", AlertType.kError)
          .set(true);
      return factory.voidRoutine();
  }

  // entry point for the auto
  // resets the odometry to the starting position,
  // then shoots the starting note,
  // then runs the trajectory to the first close note while extending the intake
  routine.running()
      .onTrue(
          resetOdometry(initialPose.get())
              .andThen(
                  autoAimAndShoot(),
                  race(
                      intake(),
                      ampToC1.cmd(),
                      aimFor(ampToC1.getFinalPose().orElse(new Pose2d()))))
              .withName("fivePieceAuto entry point"));

  // spinnup the shooter while no other command is using the shooter
  subsystemsAvailable(routine, spinnup().getRequirements())
      .and(routine.running()).onTrue(spinnup());

  // shoots the note if the robot has it, then runs the trajectory to the first middle note
  ampToC1.done().onTrue(shootIfNoteOwned()).onTrue(
      c1ToM1.cmd().beforeStarting(waitUntil(noteNotOwned(routine))));

  // extends the intake while traveling towards the first middle note
  // if the robot has the note, it goes back to shoot it,
  // otherwise it goes to the next middle note
  c1ToM1.atTime("intake").onTrue(intake());
  c1ToM1.done().and(noteOwned(routine)).onTrue(m1ToS1.cmd());
  c1ToM1.done().and(noteNotOwned(routine)).onTrue(m1ToM2.cmd());

  // aims the shooter while traveling to shoot
  m1ToS1.active().whileTrue(aimFor(m1ToS1.getFinalPose().orElseGet(Pose2d::new)));
  m1ToS1.done().onTrue(shootIfNoteOwned());
  m1ToS1.done().onTrue(m1ToM2.cmd()
      .beforeStarting(waitUntil(noteNotOwned(routine))));

  // extends the intake while traveling towards the second middle note
  // go back to shoot no matter what
  m1ToM2.active().whileTrue(intake());
  m1ToM2.done().onTrue(m2ToS1.cmd());

  // aims the shooter while traveling to shoot
  m2ToS1.active().whileTrue(aimFor(m2ToS1.getFinalPose().orElseGet(Pose2d::new)));
  m2ToS1.done().onTrue(shootIfNoteOwned());
  m2ToS1.done().onTrue(s1ToC2.cmd()
      .beforeStarting(waitUntil(noteNotOwned(routine))));

  // extends the intake while traveling towards the second close note
  // if the robot has the note, it shoots it
  // otherwise it goes to the third close note
  s1ToC2.active().whileTrue(intake());
  s1ToC2.active().whileTrue(aimFor(s1ToC2.getFinalPose().orElseGet(Pose2d::new)));
  s1ToC2.done().onTrue(shootIfNoteOwned());
  s1ToC2.done().onTrue(c2ToC3.cmd()
      .beforeStarting(waitUntil(noteNotOwned(routine))));

  // extends the intake while traveling towards the third close note
  // if the robot has the note, it shoots it
  c2ToC3.active().whileTrue(intake());
  c2ToC3.done().onTrue(shootIfNoteOwned());

  return routine;
}
```

### Creating an auto routine with triggers and a monolithic trajectory

```java
public Command fivePieceAutoTriggerMono(AutoFactory factory) {
  final AutoRoutine routine = factory.newRoutine("fivePieceAuto");

  final AutoTrajectory trajectory = factory.trajectory("fivePieceAuto", routine);
  
  final var initialPose = trajectory.getInitialPose();
  if (initialPose.isEmpty()) {
      new Alert("Error: FivePieceAuto has no starting pose", AlertType.kError)
          .set(true);
      return factory.voidRoutine();
  }

  // entry point for the auto
  // resets the odometry to the starting position,
  // then shoots the starting note,
  // then runs the trajectory to the first close note while extending the intake
  routine.running()
      .onTrue(
          resetOdometry(initialPose.get())
              .andThen(autoAimAndShoot(), trajectory.cmd())
              .withName("fivePieceAuto entry point"));

  // spinnup the shooter while no other command is running
  subsystemsAvailable(routine, spinnup().getRequirements())
      .and(routine.running()).onTrue(spinnup());

  // extends the intake when the intake event marker is reached
  trajectory.atTime("intake").onTrue(intake());
  // shoots the note when the shoot event marker is reached
  trajectory.atTime("shoot").onTrue(shootIfNoteOwned());

  // aims the shooter when the aim event marker is reached,
  // the aim command aims based on the next shoot event marker position
  final AtomicInteger shootIndex = new AtomicInteger(0);
  final Pose2d[] shootPositions = trajectory.collectEventPoses("shoot");
  trajectory.atTime("aim")
      .onTrue(defer(() -> aimFor(shootPositions[shootIndex.getAndIncrement()]), Set.of(shooter)));

  return routine.cmd().beforeStarting(() -> shootIndex.set(0)).withName("fivePieceAuto");
}
```

### Creating an auto routine with composition and a segmented trajectory

```java

public AutoRoutine fivePieceAutoCompositionSeg(AutoFactory factory) {
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

  final var initialPose = ampToC1.getInitialPose();
  if (initialPose.isEmpty()) {
      new Alert("Error: 5 piece auto has no starting pose", AlertType.kError)
          .set(true);
      return factory.voidRoutine();
  }

  Command ret = sequence(
          resetOdometry(initialPose.get()),
          autoAimAndShoot(),
          deadline(
              ampToC1.cmd(), intake(), aimFor(ampToC1.getFinalPose().orElseGet(Pose2d::new))),
          shootIfNoteOwned(),
          deadline(c1ToM1, waitSeconds(0.35).andThen(intake())),
          either(
              deadline(m1ToS1, aim()).andThen(shootIfNoteOwned()),
              deadline(m1ToM2, intake()).andThen(deadline(m2ToS1, aim()), shootIfNoteOwned()),
              noteOwned() // if you aren't using the triggers API these wouldn't need a custom routine
          ),
          deadline(s1ToC2, intake(), aim()),
          shootIfNoteOwned(),
          deadline(c2ToC3, intake(), spinnup()),
          shootIfNoteOwned()
  ).withName("fivePieceAuto");

  return factory.commandAsAutoRoutine(ret);
}
```

### Creating an auto routine with composition and a monolithic trajectory

```java
// This is not recommended for complex autos
```
