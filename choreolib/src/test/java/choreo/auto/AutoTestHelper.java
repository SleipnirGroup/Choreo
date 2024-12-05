// Copyright (c) Choreo contributors

package choreo.auto;

import choreo.auto.AutoFactory.AutoBindings;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj2.command.Subsystem;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

public class AutoTestHelper {
  public static AutoFactory factory(boolean redAlliance, Supplier<Optional<Alliance>> alliance) {
    AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
    return new AutoFactory(
        () -> pose.get(),
        sample -> pose.set(sample.getPose()),
        new Subsystem() {},
        () -> true,
        new AutoBindings(),
        Optional.empty(),
        alliance);
  }

  public static AutoFactory factory() {
    return factory(false, () -> Optional.of(Alliance.Blue));
  }
}
