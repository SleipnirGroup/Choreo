// Copyright (c) Choreo contributors

package choreo.commands3;

import static choreo.commands3.AutoTestHelper.setAlliance;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.util.ChoreoAllianceFlipUtil;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.wpilib.driverstation.Alliance;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;

@ResourceLock("timing")
public class PoseFlippingTest {
  AutoFactory factoryFlip;
  AutoFactory factoryNoFlip;

  @BeforeEach
  void setUp() {
    AutoTestHelper.setUpSim();
  }

  @AfterEach
  void tearDown() {
    AutoTestHelper.tearDownSim();
  }

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
    factoryFlip = AutoTestHelper.factory(true);
    factoryNoFlip = AutoTestHelper.factory(false);
    Pose2d start = new Pose2d();
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

    AutoTrajectory autoTrajFlipped =
        factoryFlip.trajectory(trajectory, new AutoRoutine(factoryFlip, "flip") {}, true);
    testPoseProperlyFlipped(start, startFlipped, autoTrajFlipped::getInitialPose);
    testPoseProperlyFlipped(end, endFlipped, autoTrajFlipped::getFinalPose);

    AutoTrajectory autoTrajNoFlip =
        factoryNoFlip.trajectory(trajectory, new AutoRoutine(factoryNoFlip, "noFlip") {}, true);
    testPoseProperlyNoFlipped(start, autoTrajNoFlip::getInitialPose);
    testPoseProperlyNoFlipped(end, autoTrajNoFlip::getFinalPose);
  }
}
