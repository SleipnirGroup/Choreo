# Auto Controller

Choreo trajectory samples contain a lot of information. Due to this complexity, the
task of implementing how to follow these samples is left up to the user.

The "Auto Controller" is a function that consumes a `Pose2d` as well as a sample (`SwerveSample` or `DifferentialSample` depending on drive base).
The controller should capture your drive subsystem to directly control it.

## Basic PID Controller

The most basic implementation of a vendor-independent auto controller is a PID controller.
This controller will take the base requested velocity from the sample and add the output of the PID controller to it.
The PID controller output is based on how far the robot is from the desired position.

```java
public class AutoController implements Consumer<SwerveSample> {
    private final Drive drive; // drive subsystem
    private final PIDController xController = new PIDController(
        kAuto.kTranslation.kP,
        0.0,
        kAuto.kTranslation.kD
    );
    private final PIDController yController = new PIDController(
        kAuto.kTranslation.kP,
        0.0,
        kAuto.kTranslation.kD
    );
    private final PIDController headingController = new PIDController(
        kAuto.kRotation.kP,
        0.0,
        kAuto.kRotation.kD
    );

    public AutoController(Drive drive) {
        this.drive = drive;
        headingController.enableContinuousInput(-Math.PI, Math.PI);
    }

    @Override
    public void accept(SwerveSample referenceState) {
        Pose2d pose = drive.getPose();
        double xFF = referenceState.vx;
        double yFF = referenceState.vy;
        double rotationFF = referenceState.omega;

        double xFeedback = xController.calculate(pose.getX(), referenceState.x);
        double yFeedback = yController.calculate(pose.getY(), referenceState.y);
        double rotationFeedback = headingController.calculate(pose.getRotation().getRadians(),
            referenceState.heading);

        ChassisSpeeds out = ChassisSpeeds.fromFieldRelativeSpeeds(
            xFF + xFeedback,
            yFF + yFeedback,
            rotationFF + rotationFeedback,
            pose.getRotation()
        );

        swerve.drive(out);
    }
}
```

## Advanced Controllers

As a more advanced control strategy, you can utilize the acceleration from the sample to implement feedforward. You can also use the forces from the sample with the CTRE Swerve API or a custom implementation to better adhere to the model.

Examples:

* [Phoenix 6 swerve with ChoreoLib](https://github.com/CrossTheRoadElec/Phoenix6-Examples/blob/main/java/SwerveWithChoreo/src/main/java/frc/robot/subsystems/CommandSwerveDrivetrain.java#L196-L215)
* [Phoenix 6 swerve with PathPlannerLib](https://github.com/CrossTheRoadElec/Phoenix6-Examples/blob/main/java/SwerveWithPathPlanner/src/main/java/frc/robot/subsystems/CommandSwerveDrivetrain.java#L182-L200)
