// Copyright (c) Choreo contributors

package choreo.trajectory;

import edu.wpi.first.math.geometry.Pose2d;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.List;
import java.util.stream.Collectors;

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

  /**
 * Reads given resource file as a string.
 *
 * @param fileName path to the resource file
 * @return the file's contents
 * @throws IOException if read fails for any reason
 */
public static String getResourceFileAsString(String fileName) throws IOException {
    ClassLoader classLoader = ClassLoader.getSystemClassLoader();
    try (InputStream is = classLoader.getResourceAsStream(fileName)) {
        if (is == null) return null;
        try (InputStreamReader isr = new InputStreamReader(is);
             BufferedReader reader = new BufferedReader(isr)) {
            return reader.lines().collect(Collectors.joining(System.lineSeparator()));
        }
    }
}
}
