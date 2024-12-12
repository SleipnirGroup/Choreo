// Copyright (c) Choreo contributors

package choreo.auto;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj2.command.Subsystem;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;

public class AutoTestHelper {
  public static AutoFactory factory(
      Supplier<Optional<Alliance>> alliance, BooleanSupplier useAllianceFlipping) {
    AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
    return new AutoFactory(
        () -> pose.get(),
        newPose -> pose.set(newPose),
        sample -> pose.set(sample.getPose()),
        useAllianceFlipping,
        new Subsystem() {},
        new AutoFactory.AutoBindings(),
        (sample, isStart) -> {},
        alliance);
  }

  public static AutoFactory factory() {
    return factory(() -> Optional.of(Alliance.Blue), () -> false);
  }
}
