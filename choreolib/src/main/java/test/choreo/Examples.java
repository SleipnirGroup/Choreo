package test.choreo;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj2.command.Command;
import static edu.wpi.first.wpilibj2.command.Commands.*;
import edu.wpi.first.wpilibj2.command.ConditionalCommand;
import edu.wpi.first.wpilibj2.command.Subsystem;
import edu.wpi.first.wpilibj2.command.button.Trigger;

import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import choreo.ChoreoAutoFactory;
import choreo.ChoreoAutoLoop;
import choreo.ChoreoAutoTrajectory;

public class Examples {
  private static Subsystem shooter = new Subsystem() {
  };

  private static Command intake() {
    return none();
  }

  private static Command shootIfGp() {
    return none();
  }

  private static Command spinnup() {
    return none();
  }

  private static Command aimFor(Pose2d pose) {
    return none();
  }

  private static Command aim() {
    return none();
  }

  private static Command autoAimAndShoot() {
    return none();
  }

  private static Command resetOdometry(Pose2d pose) {
    return none();
  }

  private static Trigger yeGp(ChoreoAutoLoop loop) {
    return new Trigger(() -> false);
  }

  private static Trigger noGp(ChoreoAutoLoop loop) {
    return new Trigger(() -> false);
  }

  private static Trigger yeGp() {
    return new Trigger(() -> false);
  }

  public Command fivePieceAutoTriggerSeg(ChoreoAutoFactory factory) {
    final ChoreoAutoLoop loop = factory.newLoop();

    // This uses segments that all have predefined handoff points.
    // These handoff points follow a naming convention
    // C1, C2, C3: The 3 close notes, C1 having the greatest y value
    // M1, M2, M3, M4, M5: The 5 middle notes, M1 having the greatest y value
    // S1, S2, S3: 3 arbitrary shooting positions that are near the stage, S1 having the greatest y value
    // AMP, SUB, SRC: The 3 starting positions

    // Try to load all the trajectories we need
    final ChoreoAutoTrajectory ampToC1 = factory.traj("ampToC1", loop);
    final ChoreoAutoTrajectory c1ToM1 = factory.traj("c1ToM1", loop);
    final ChoreoAutoTrajectory m1ToS1 = factory.traj("m1ToS1", loop);
    final ChoreoAutoTrajectory m1ToM2 = factory.traj("m1ToM2", loop);
    final ChoreoAutoTrajectory m2ToS1 = factory.traj("m2ToS2", loop);
    final ChoreoAutoTrajectory s1ToC2 = factory.traj("s1ToC2", loop);
    final ChoreoAutoTrajectory c2ToC3 = factory.traj("c2ToC3", loop);

    // entry point for the auto
    // resets the odometry to the starting position,
    // then shoots the starting note,
    // then runs the trajectory to the first close note while extending the intake
    loop.enabled().onTrue(
        resetOdometry(ampToC1.getInitialPose()
            .orElseGet(() -> {
              loop.kill();
              return new Pose2d();
            })).andThen(
                autoAimAndShoot(),
                race(
                    intake(),
                    ampToC1.cmd(),
                    aimFor(ampToC1.getFinalPose().orElseGet(Pose2d::new))))
            .withName("fivePieceAuto entry point")
    );

    // spinnup the shooter while no other command is running
    loop.enabled().whileTrueDefault(spinnup());

    // shoots the note if the robot has it, then runs the trajectory to the first middle note
    ampToC1.done()
        .onTrue(shootIfGp())
        .onTrue(c1ToM1.cmd().waitFor(noGp(loop)));

    // extends the intake while traveling towards the first middle note
    // if the robot has the note, it goes back to shoot it,
    // otherwise it goes to the next middle note
    c1ToM1.atTime("intake").onTrue(intake());
    c1ToM1.done().and(yeGp(loop)).onTrue(m1ToS1.cmd());
    c1ToM1.done().and(noGp(loop)).onTrue(m1ToM2.cmd());

    // aims the shooter while traveling to shoot
    m1ToS1.active().whileTrue(aimFor(m1ToS1.getFinalPose().orElseGet(Pose2d::new)));
    m1ToS1.done().onTrue(shootIfGp());
    m1ToS1.done().onTrue(m1ToM2.cmd().waitFor(noGp(loop)));

    // extends the intake while traveling towards the second middle note
    // go back to shoot no matter what
    m1ToM2.active().whileTrue(intake());
    m1ToM2.done().onTrue(m2ToS1.cmd());

    // aims the shooter while traveling to shoot
    m2ToS1.active().whileTrue(aimFor(m2ToS1.getFinalPose().orElseGet(Pose2d::new)));
    m2ToS1.done().onTrue(shootIfGp());
    m2ToS1.done().onTrue(s1ToC2.cmd().waitFor(noGp(loop)));

    // extends the intake while traveling towards the second close note
    // if the robot has the note, it shoots it
    // otherwise it goes to the third close note
    s1ToC2.active().whileTrue(intake());
    s1ToC2.active().whileTrue(aimFor(s1ToC2.getFinalPose().orElseGet(Pose2d::new)));
    s1ToC2.done().onTrue(shootIfGp());
    s1ToC2.done().onTrue(c2ToC3.cmd().waitFor(noGp(loop)));

    // extends the intake while traveling towards the third close note
    // if the robot has the note, it shoots it
    c2ToC3.active().whileTrue(intake());
    c2ToC3.done().onTrue(shootIfGp());

    return loop.cmd();
  }

  public Command fivePieceAutoTriggerMono(ChoreoAutoFactory factory) {
    final ChoreoAutoLoop loop = factory.newLoop();

    final ChoreoAutoTrajectory traj = factory.traj("fivePieceAuto", loop);

    // entry point for the auto
    // resets the odometry to the starting position,
    // then shoots the starting note,
    // then runs the trajectory to the first close note while extending the intake
    loop.enabled().onTrue(
        resetOdometry(traj.getInitialPose()
            .orElseGet(() -> {
              loop.kill();
              return new Pose2d();
            })).andThen(
                autoAimAndShoot(),
                traj.cmd())
            .withName("fivePieceAuto entry point")
    );

    // spinnup the shooter while no other command is running
    loop.enabled().whileTrueDefault(spinnup());

    // extends the intake when the intake event marker is reached
    traj.atTime("intake").onTrue(intake());
    // shoots the note when the shoot event marker is reached
    traj.atTime("shoot").onTrue(shootIfGp());

    // aims the shooter when the aim event marker is reached,
    // the aim command aims based on the next shoot event marker position
    final AtomicInteger shootIndex = new AtomicInteger(0);
    final Pose2d[] shootPositions = traj.collectEventPoses("shoot");
    traj.atTime("aim").onTrue(defer(
        () -> aimFor(shootPositions[shootIndex.getAndIncrement()]),
        Set.of(shooter)));

    return loop.cmd().beforeStarting(() -> shootIndex.set(0)).withName("fivePieceAuto");
  }

  public Command fivePieceAutoCompositionSeg(ChoreoAutoFactory factory) {

    // This uses segments that all have predefined handoff points.
    // These handoff points follow a naming convention
    // C1, C2, C3: The 3 close notes, C1 having the greatest y value
    // M1, M2, M3, M4, M5: The 5 middle notes, M1 having the greatest y value
    // S1, S2, S3: 3 arbitrary shooting positions that are near the stage, S1 having the greatest y value
    // AMP, SUB, SRC: The 3 starting positions

    // Try to load all the trajectories we need
    final ChoreoAutoTrajectory ampToC1 = factory.traj("ampToC1", ChoreoAutoFactory.VOID_LOOP);
    final Command c1ToM1 = factory.trajCommand("c1ToM1");
    final Command m1ToS1 = factory.trajCommand("m1ToS1");
    final Command m1ToM2 = factory.trajCommand("m1ToM2");
    final Command m2ToS1 = factory.trajCommand("m2ToS2");
    final Command s1ToC2 = factory.trajCommand("s1ToC2");
    final Command c2ToC3 = factory.trajCommand("c2ToC3");

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
          ampToC1.cmd(),
          intake(),
          aimFor(ampToC1.getFinalPose().orElseGet(Pose2d::new))
        ),
        shootIfGp(),
        deadline(
          c1ToM1,
          waitSeconds(0.35).andThen(intake())
        ),
        new ConditionalCommand(
          deadline(
            m1ToS1,
            aim()
          ).andThen(shootIfGp()),
          deadline(
            m1ToM2,
            intake()
          ).andThen(
            deadline(
              m2ToS1,
              aim()
            ),
            shootIfGp()
          ),
          yeGp() // if you arent using the triggers api these wouldnt need a custom loop
        ),
        deadline(
          s1ToC2,
          intake(),
          aim()
        ),
        shootIfGp(),
        deadline(
          c2ToC3,
          intake(),
          spinnup()
        ),
        shootIfGp()
    ).withName("fivePieceAuto");
  }
}