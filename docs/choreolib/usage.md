``` { .java .select }
import com.choreo.lib.*;

ChoreoTrajectory traj = Choreo.getTrajectory("Trajectory"); // (1)

// (2)
Choreo.choreoSwerveCommand(
    traj, // (3)
    this::getPose // (4)
    new PIDController(Constants.AutoConstants.kPXController, 0.0, 0.0), // (5)
    new PIDController(Constants.AutoConstants.kPXController, 0.0, 0.0), // (6)
    new PIDController(Constants.AutoConstants.kPThetaController, 0.0, 0.0), // (7)
    (ChassisSpeeds speeds) -> // (8)
        this.drive(new Translation2d(speeds.vxMetersPerSecond, speeds.vyMetersPerSecond), ...),
    () -> {
        Optional<DriverStation.Alliance> alliance = DriverStation.getAlliance();
            mirror = alliance.isPresent() && alliance.get() == Alliance.Red;
    }, // (9)
    this, // (10)
);
```

1. Do not include .traj extension when referencing the file name. this file should be in: "{deployDirectory}/choreo/".
2. Create a swerve command for the robot to follow the trajectory.
3. Choreo trajectory from above.
4. A function that returns the current field-relative pose of the robot: your wheel or vision odometry.
5. PIDController for field-relative X translation (input: X error in meters, output: m/s).
6. PIDController for field-relative Y translation (input: Y error in meters, output: m/s).
7. PID constants to correct for rotation error.
8. A function that consumes the target robot-relative chassis speeds and commands them to the robot.
9. If this returns true, the path will be mirrored based on alliance (this assumes the path is created for the blue alliance).
10. The subsystem(s) to require, typically your drive subsystem (this).
