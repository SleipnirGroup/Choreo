// Copyright (c) Choreo contributors

package choreo.auto;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.driverstation.Alliance;
import org.wpilib.driverstation.internal.DriverStationBackend;
import org.wpilib.hardware.hal.AllianceStationID;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.simulation.DriverStationSim;

public class AutoTestHelper {
  public static AutoFactory factory(
      Scheduler scheduler, boolean useAllianceFlipping, AtomicReference<Pose2d> robotPose) {
    return new AutoFactory(
        robotPose::get,
        robotPose::set,
        sample -> robotPose.set(sample.getPose()),
        useAllianceFlipping,
        new Mechanism("Dummy Drivetrain", scheduler) {},
        (sample, isStart) -> {});
  }

  public static AutoFactory factory(Scheduler scheduler, boolean useAllianceFlipping) {
    AtomicReference<Pose2d> pose = new AtomicReference<>(new Pose2d());
    return factory(scheduler, useAllianceFlipping, pose);
  }

  public static void setAlliance(Optional<Alliance> alliance) {
    var id =
        alliance
            .map(
                all -> {
                  if (all.equals(Alliance.BLUE)) {
                    return AllianceStationID.BLUE_1;
                  } else {
                    return AllianceStationID.RED_1;
                  }
                })
            .orElse(AllianceStationID.UNKNOWN);
    DriverStationSim.setAllianceStationId(id);
    DriverStationSim.notifyNewData();
    DriverStationBackend.refreshData();
  }
}
