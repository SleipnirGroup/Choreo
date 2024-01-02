``` java
import com.choreo.lib.*;

// do not include .traj extension when referencing the file name
// this file should be in: "{deployDirectory}/choreo/"
ChoreoTrajectory traj = Choreo.getTrajectory("Trajectory");

// Create a swerve command for the robot to follow the trajectory
Choreo.choreoSwerveCommand(
    traj, // Choreo trajectory from above
    this::getPose // A function that returns the current field-relative pose of the robot: your wheel or vision odometry
    new PIDController(Constants.AutoConstants.kPXController, 0.0, 0.0), // PIDController for field-relative X translation (input: X error in meters, output: m/s).
    new PIDController(Constants.AutoConstants.kPXController, 0.0, 0.0), // PIDController for field-relative Y translation (input: Y error in meters, output: m/s).
    new PIDController(Constants.AutoConstants.kPThetaController, 0.0, 0.0), // PID constants to correct for rotation error
    (ChassisSpeeds speeds) -> // A function that consumes the target robot-relative chassis speeds and commands them to the robot
        this.drive(new Translation2d(speeds.vxMetersPerSecond, speeds.vyMetersPerSecond), ...),
    true, // Whether or not to mirror the path based on alliance (this assumes the path is created for the blue alliance)
    this, // The subsystem(s) to require, typically your drive subsystem (this) only
);
```