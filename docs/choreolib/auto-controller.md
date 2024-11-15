# Auto Controller

Choreo trajectory samples contain a lot of information, due to this complexity the
task of implementing how to follow these samples is left up to the user.

The "Auto Controller" is a function that consumes a `Pose2d` aswell as a sample (`SwerveSample` or `DifferentialSample` depending on drive base).
The controller should capture your drive subsystem to directly control it.

## Basic PID Controller

The most basic implementation of an auto controller that is indifferent to vendors is a PID controller based one.
This controller will take the base requested velocity from the sample and add the output of the PID controller to it.
The PID controller output is based on how far the robot is from the desired position.

```java
public class AutoController implements BiConsumer<Pose2d, SwerveSample> {
    private final Swerve swerve;
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
    private final PIDController rController = new PIDController(
        kAuto.kRotation.kP,
        0.0,
        kAuto.kRotation.kD
    );

    public AutoController(Swerve swerve) {
        this.swerve = swerve;
        rController.enableContinuousInput(-Math.PI, Math.PI);
    }

    @Override
    public void accept(Pose2d pose, SwerveSample referenceState) {
        double xFF = referenceState.vx;
        double yFF = referenceState.vy;
        double rotationFF = referenceState.omega;

        double xFeedback = xController.calculate(pose.getX(), referenceState.x);
        double yFeedback = yController.calculate(pose.getY(), referenceState.y);
        double rotationFeedback = rController.calculate(pose.getRotation().getRadians(),
            referenceState.heading);

        ChassisSpeeds out = ChassisSpeeds.fromFieldRelativeSpeeds(
            xFF + xFeedback,
            yFF + yFeedback,
            rotationFF + rotationFeedback,
            pose.getRotation()
        );

        swerve.drive(out, false);
    }
}
```

## Advanced Controllers

More examples are coming soon.
A good tip is using the acceleration from the sample to implement feedforward.
You can also use the forces from the sample with CTRE swerve or a custom implementation to respect the model even better.
