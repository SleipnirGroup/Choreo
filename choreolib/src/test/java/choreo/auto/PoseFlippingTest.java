package choreo.auto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import choreo.util.AllianceFlipUtil;
import edu.wpi.first.hal.HAL;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.SchedulerMaker;

public class PoseFlippingTest {
    Optional<Alliance> alliance;
    boolean useAllianceFlipping;
    AutoFactory factory;
    @BeforeEach
    void setup() {
        factory = AutoTestHelper.factory(()->alliance, ()->useAllianceFlipping);
    }
    /** Test for a pose that flips when flipping is enabled and alliance is red,
     * is unflipped whenever flipping is disabled,
     * and is empty when flipping is enabled and alliance is empty */

    void testPoseProperlyFlipped(Pose2d unflipped, Pose2d flipped, Supplier<Optional<Pose2d>> poseToTest) {
        alliance = Optional.empty();
        useAllianceFlipping = true;
        assertTrue(poseToTest.get().isEmpty());
        alliance = Optional.of(Alliance.Blue);
        assertEquals(poseToTest.get(), Optional.of(unflipped));
        alliance = Optional.of(Alliance.Red);
        assertEquals(poseToTest.get(), Optional.of(flipped));
        // initial pose is the unflipped pose if flipping is disabled, for all three alliances
        useAllianceFlipping = false;
        assertEquals(poseToTest.get(), Optional.of(unflipped));
        alliance = Optional.of(Alliance.Blue);
        assertEquals(poseToTest.get(), Optional.of(unflipped));
        alliance = Optional.of(Alliance.Red);
        assertEquals(poseToTest.get(), Optional.of(unflipped));
    }
    @Test
    void testGetEndPose() {
        Pose2d start = Pose2d.kZero;
        Pose2d end = new Pose2d(1,1, Rotation2d.fromRadians(1));
        Pose2d startFlipped = AllianceFlipUtil.flip(start);
        Pose2d endFlipped = AllianceFlipUtil.flip(end);
        Trajectory<SwerveSample> trajectory = new Trajectory<>("test", List.of(
            new SwerveSample(0, start.getX(), start.getY(), start.getRotation().getRadians(), 0,0,0, 0, 0, 0, new double[4], new double[4]),
            new SwerveSample(0, end.getX(), end.getY(), end.getRotation().getRadians(), 0, 0, 0, 0, 0, 0, new double[4], new double[4])
        )
        , List.of(), List.of());
        
        AutoTrajectory autoTrajectory = factory.trajectory(trajectory, factory.newRoutine("testroutine"));
        testPoseProperlyFlipped(start, startFlipped, autoTrajectory::getInitialPose );
        testPoseProperlyFlipped(start, startFlipped, autoTrajectory.getInitialPoseSupplier());
        testPoseProperlyFlipped(end, endFlipped, autoTrajectory::getFinalPose );
        testPoseProperlyFlipped(end, endFlipped, autoTrajectory.getFinalPoseSupplier());
    }
}
