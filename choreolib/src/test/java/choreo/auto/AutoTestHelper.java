package choreo.auto;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import choreo.auto.AutoFactory.AutoBindings;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj2.command.Subsystem;

public class AutoTestHelper {
    public static AutoFactory factory(boolean redAlliance) {
        AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
        return new AutoFactory(
            () -> pose.get(),
            (p, sample) -> pose.set(sample.getPose()),
            () -> redAlliance,
            new Subsystem() {},
            new AutoBindings(),
            Optional.empty()
        );
    }

    public static AutoFactory factory() {
        return factory(false);
    }
}
