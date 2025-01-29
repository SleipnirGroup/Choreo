// Copyright (c) Choreo contributors

package choreo.auto;

import edu.wpi.first.hal.AllianceStationID;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj2.command.Subsystem;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

public class AutoTestHelper {
  public static AutoFactory factory(
      boolean useAllianceFlipping, AtomicReference<Pose2d> robotPose) {
    // AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
    return new AutoFactory(
        () -> robotPose.get(),
        newPose -> robotPose.set(newPose),
        sample -> robotPose.set(sample.getPose()),
        useAllianceFlipping,
        new Subsystem() {},
        (sample, isStart) -> {});
  }

  public static AutoFactory factory(boolean useAllianceFlipping) {
    AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
    return factory(useAllianceFlipping, pose);
  }

  public static AutoFactory factory() {
    return factory(false);
  }

  public static void setAlliance(Optional<Alliance> alliance) {
    var id =
        alliance
            .map(
                all -> {
                  if (all.equals(Alliance.Blue)) {
                    return AllianceStationID.Blue1;
                  } else {
                    return AllianceStationID.Red1;
                  }
                })
            .orElse(AllianceStationID.Unknown);
    DriverStationSim.setAllianceStationId(id);
    DriverStationSim.notifyNewData();
    DriverStation.refreshData();
  }
}
