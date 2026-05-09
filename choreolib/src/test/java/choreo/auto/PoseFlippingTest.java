// Copyright (c) Choreo contributors

package choreo.auto;

import static choreo.auto.AutoTestHelper.setAlliance;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.util.ChoreoAllianceFlipUtil;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.wpilib.command3.Scheduler;
import org.wpilib.driverstation.Alliance;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;

public class PoseFlippingTest {
  AutoFactory factoryFlip;
  AutoFactory factoryNoFlip;

  /// Test for a pose that flips when flipping is enabled and alliance is red, is unflipped whenever
  /// flipping is disabled, and is empty when flipping is enabled and alliance is empty
  void testPoseProperlyFlipped(
      Pose2d unflipped, Pose2d flipped, Supplier<Optional<Pose2d>> poseToTest) {
    setAlliance(Optional.empty());
    assertTrue(poseToTest.get().isEmpty());
    setAlliance(Optional.of(Alliance.BLUE));
    assertEquals(poseToTest.get(), Optional.of(unflipped));
    setAlliance(Optional.of(Alliance.RED));
    assertEquals(poseToTest.get(), Optional.of(flipped));
  }

  void testPoseProperlyNoFlipped(Pose2d unflipped, Supplier<Optional<Pose2d>> poseToTest) {
    assertEquals(poseToTest.get(), Optional.of(unflipped));
    setAlliance(Optional.of(Alliance.BLUE));
    assertEquals(poseToTest.get(), Optional.of(unflipped));
    setAlliance(Optional.of(Alliance.RED));
    assertEquals(poseToTest.get(), Optional.of(unflipped));
  }

  @Test
  void testGetEndPose() {
    assert HAL.initialize(500, 0);
    Scheduler scheduler = Scheduler.createIndependentScheduler();
    factoryFlip = AutoTestHelper.factory(scheduler, true);
    factoryNoFlip = AutoTestHelper.factory(scheduler, false);
    Pose2d start = Pose2d.kZero;
    Pose2d end = new Pose2d(1, 1, Rotation2d.fromRadians(1));
    Pose2d startFlipped = ChoreoAllianceFlipUtil.flip(start);
    Pose2d endFlipped = ChoreoAllianceFlipUtil.flip(end);
    Trajectory<SwerveSample> trajectory =
        new Trajectory<>(
            "test",
            List.of(
                new SwerveSample(
                    0,
                    start.getX(),
                    start.getY(),
                    start.getRotation().getRadians(),
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    new double[4],
                    new double[4]),
                new SwerveSample(
                    0,
                    end.getX(),
                    end.getY(),
                    end.getRotation().getRadians(),
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    new double[4],
                    new double[4])),
            List.of(),
            List.of());

    AutoTrajectory autoTrajFlipped = factoryFlip.trajectory(trajectory);
    testPoseProperlyFlipped(start, startFlipped, autoTrajFlipped::getInitialPose);
    testPoseProperlyFlipped(end, endFlipped, autoTrajFlipped::getFinalPose);

    AutoTrajectory autoTrajNoFlip = factoryNoFlip.trajectory(trajectory);
    testPoseProperlyNoFlipped(start, autoTrajNoFlip::getInitialPose);
    testPoseProperlyNoFlipped(end, autoTrajNoFlip::getFinalPose);
  }
}
