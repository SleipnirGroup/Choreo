// Copyright (c) Choreo contributors

package choreo.trajectory;

import edu.wpi.first.math.geometry.Pose2d;
import java.util.List;

public class TrajectoryTestHelper {
  private static final double DT = 0.005;

  @SuppressWarnings("unchecked")
  public static <SampleType extends TrajectorySample<SampleType>>
      Trajectory<SampleType> linearTrajectory(
          String name, Pose2d start, Pose2d end, double duration, Class<SampleType> sampleType) {
    int sampleCount = (int) Math.floor(duration / DT);

    if (sampleCount < 2) {
      throw new IllegalArgumentException("Duration is too short for a trajectory");
    }

    Trajectory<?> trajectory = null;
    Pose2d lastPose = start;
    double lastVx = 0.01, lastVy = 0.01, lastOmega = 0.01;
    if (sampleType == SwerveSample.class) {
      SwerveSample[] samples = new SwerveSample[sampleCount];
      for (int i = 0; i < sampleCount; i++) {
        double t = (i * DT) / duration;
        Pose2d pose = start.interpolate(end, t);

        double x = pose.getTranslation().getX();
        double y = pose.getTranslation().getY();
        double heading = pose.getRotation().getRadians();

        double vx = (x - lastPose.getTranslation().getX()) / DT;
        double vy = (y - lastPose.getTranslation().getY()) / DT;
        double omega = (heading - lastPose.getRotation().getRadians()) / DT;

        double ax = (vx - lastVx) / DT;
        double ay = (vy - lastVy) / DT;
        double alpha = (omega - lastOmega) / DT;

        lastPose = pose;
        lastVx = vx;
        lastVy = vy;
        lastOmega = omega;

        samples[i] =
            new SwerveSample(
                i * DT, x, y, heading, vx, vy, omega, ax, ay, alpha, new double[4], new double[4]);
      }
      var st = new Trajectory<SwerveSample>(name, List.of(samples), List.of(), List.of());
      trajectory = st;
    } else if (sampleType == DifferentialSample.class) {
      throw new IllegalArgumentException("DifferentialDrive not implemented");
    } else {
      throw new IllegalArgumentException("Invalid sample type");
    }

    return (Trajectory<SampleType>) trajectory;
  }
}
