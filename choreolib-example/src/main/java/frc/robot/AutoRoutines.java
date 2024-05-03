package frc.robot;

import com.choreo.lib.ChoreoAutoFactory;
import com.choreo.lib.ChoreoAutoLoop;

import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.kControls;
import frc.robot.subsystems.Intake;
import frc.robot.subsystems.Shooter;
import frc.robot.subsystems.drive.Swerve;

public class AutoRoutines {
    public static class ChoreoAutoLoopFinishable extends ChoreoAutoLoop {
        private final Trigger finished;

        public ChoreoAutoLoopFinishable(ChoreoAutoLoop loop, Trigger finishedTrigger) {
            super(loop.getName(), loop.getLoop());
            finished = finishedTrigger;
        }

        public Trigger finished() {
            return finished;
        }
    }

    private final Swerve swerve;
    private final Intake intake;
    private final Shooter shooter;

    public AutoRoutines(Swerve swerve, Intake intake, Shooter shooter) {
        this.swerve = swerve;
        this.intake = intake;
        this.shooter = shooter;
    }

    public ChoreoAutoLoop shootAndBackup(ChoreoAutoFactory factory) {
        var loop = factory.newLoop("shootAndBackup");

        var traj = factory.traj("backup2m", loop);

        loop.enabled().onTrue(swerve.runOnce(() -> swerve.resetOdometry(traj.getStartingPose())));
        loop.enabled().whileTrue(shooter.spinup(kControls.AUTO_SHOOTER_RPM));
        loop.enabled().and(shooter.reachedTarget()).onTrue(intake.feed());
        loop.enabled()
            .and(shooter.reachedTarget())
            .and(intake.hasNote().negate())
            .onTrue(traj.cmd());

        return loop;
    }

    public ChoreoAutoLoopFinishable fourpiece(ChoreoAutoFactory factory) {
        var loop = factory.newLoop("fourpiece");

        var subC1sub = factory.traj("c1sub", loop); // goes from sub to the first note and back to sub
        var subC2sub = factory.traj("c2sub", loop); // goes from sub to the second note and back to sub
        var subC3sub = factory.traj("c3sub", loop); // goes from sub to the third note and back to sub

        loop.enabled().onTrue(swerve.runOnce(() -> swerve.resetOdometry(subC1sub.getStartingPose())));
        loop.enabled().whileTrue(shooter.spinup(kControls.AUTO_SHOOTER_RPM));     // spin up the shooter
        loop.enabled().and(intake.hasNote())
            .onTrue(intake.stop()) // intake while no note is held
            .onFalse(intake.intake()); // stop intaking when a note is held

        // Feed the shooter if no trajectory is running
        loop.enabled()
            .and(shooter.reachedTarget())
            .and(subC1sub.inactive())
            .and(subC2sub.inactive())
            .and(subC3sub.inactive())
            .onTrue(intake.feed());

        loop.enabled().and(shooter.reachedTarget()).and(intake.hasNote().negate()).onTrue(subC1sub.cmd());  // go to the first note
        subC1sub.done().and(intake.hasNote().negate()).onTrue(subC2sub.cmd());                              // go to the second note
        subC2sub.done().and(intake.hasNote().negate()).onTrue(subC3sub.cmd());                              // go to the third note

        return new ChoreoAutoLoopFinishable(loop, subC3sub.done().and(intake.hasNote().negate()));
    }

    public ChoreoAutoLoop fivepiece(ChoreoAutoFactory factory) {
        var loop = fourpiece(factory);

        loop.setName("fivepiece");

        var traj = factory.traj("m1sub", loop);

        loop.finished().onTrue(traj.cmd());

        return loop;
    }
}
