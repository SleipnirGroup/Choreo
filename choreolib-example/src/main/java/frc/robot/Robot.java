// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import java.util.List;

import com.choreo.lib.Choreo;
import com.choreo.lib.ChoreoControlFunction;

import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Transform2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.kRobotGeometry;
import frc.robot.subsystems.Intake;
import frc.robot.subsystems.Shooter;
import frc.robot.subsystems.drive.Swerve;

/**
 * This is an example of using choreo on a robot with an under the bumper intak
 * and a fixed shooter that can only make subwoofer shots
 * 
 * This robot only supports auto and sim, deploying this to a robot will do nothing and teleop sim has near 0 behavior
 */
public class Robot extends TimedRobot {
  private final Intake intake = new Intake();
  private final Shooter shooter = new Shooter();
  private final Swerve swerve = new Swerve();

  private final ChoreoAutoChooser autoChooser;

  public Robot() {
    super();

    Trigger pickedupNote = AutoNoteTracker.setupAutoNoteIntake(
      swerve::getPose,
      intake.isIntaking(),
      bleh -> {},
      List.of(
        new Transform2d(
          new Translation2d(
            -kRobotGeometry.FRAME_WIDTH / 2.0,
            -kRobotGeometry.FRAME_WIDTH / 3.0
          ),
          new Rotation2d()
        ),
        new Transform2d(
          new Translation2d(
            -kRobotGeometry.FRAME_WIDTH / 2.0,
            kRobotGeometry.FRAME_WIDTH / 3.0
          ),
          new Rotation2d()
        )
      )
    );
    pickedupNote.onTrue(intake.setExitBeam(true));

    autoChooser = new ChoreoAutoChooser(
      Choreo.createAutoFactory(
        swerve::getPose,
        choreoSwerveController(),
        chassisSpeeds -> swerve.drive(chassisSpeeds, false),
        () -> DriverStation.getAlliance().orElse(Alliance.Blue).equals(Alliance.Red),
        swerve
      )
    );

    var routines = new AutoRoutines(intake, shooter);

    autoChooser.addAutoRoutine("Shoot and Backup", routines::shootAndBackup);
    autoChooser.addAutoRoutine("Four Piece Sub", routines::fourpiece);
    autoChooser.addAutoRoutine("Five Piece Sub", routines::fivepiece);
  }

  @Override
  public void robotInit() {}

  @Override
  public void robotPeriodic() {}

  @Override
  public void autonomousInit() {}

  @Override
  public void autonomousPeriodic() {}

  @Override
  public void teleopInit() {}

  @Override
  public void teleopPeriodic() {}

  @Override
  public void disabledInit() {}

  @Override
  public void disabledPeriodic() {}

  @Override
  public void testInit() {}

  @Override
  public void testPeriodic() {}

  @Override
  public void simulationInit() {}

  @Override
  public void simulationPeriodic() {}

  public static ChoreoControlFunction choreoSwerveController() {
    PIDController xController = new PIDController(3.0, 0.0, 0.0);
    PIDController yController = new PIDController(3.0, 0.0, 0.0);
    PIDController rotationController = new PIDController(3.0, 0.0, 0.0);
    xController.close(); yController.close(); rotationController.close();
    rotationController.enableContinuousInput(-Math.PI, Math.PI);
    return (pose, referenceState) -> {
      double xFF = referenceState.velocityX;
      double yFF = referenceState.velocityY;
      double rotationFF = referenceState.angularVelocity;

      double xFeedback = xController.calculate(pose.getX(), referenceState.x);
      double yFeedback = yController.calculate(pose.getY(), referenceState.y);
      double rotationFeedback =
          rotationController.calculate(pose.getRotation().getRadians(), referenceState.heading);

      return ChassisSpeeds.fromFieldRelativeSpeeds(
          xFF + xFeedback, yFF + yFeedback, rotationFF + rotationFeedback, pose.getRotation());
    };
  }
}
