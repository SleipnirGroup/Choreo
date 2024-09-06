// Copyright (c) Choreo contributors

package choreo.util;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import java.util.HashMap;

public class AllianceFlipUtil {
  private static double fieldLength = 16.5410515;
  private static double fieldWidth = 8.23052575;

  private interface FlipperImpl {
    double flipX(double x);

    double flipY(double y);

    double flipHeading(double heading);
  }

  private static class MirroredFlipper implements FlipperImpl {
    private double fieldMeters = 16.5410515;

    @Override
    public double flipX(double x) {
      return fieldMeters - x;
    }

    @Override
    public double flipY(double y) {
      return y;
    }

    @Override
    public double flipHeading(double heading) {
      return Math.PI - heading;
    }
  }

  private static class RotateAroundFlipper implements FlipperImpl {
    @Override
    public double flipX(double x) {
      return fieldLength - x;
    }

    @Override
    public double flipY(double y) {
      return fieldWidth - y;
    }

    @Override
    public double flipHeading(double heading) {
      return Math.PI - heading;
    }
  }

  public static enum Flipper {
    MIRRORED(new MirroredFlipper()),
    ROTATE_AROUND(new RotateAroundFlipper());

    private final FlipperImpl flipper;

    Flipper(FlipperImpl flipper) {
      this.flipper = flipper;
    }

    private FlipperImpl getFlipper() {
      return flipper;
    }
  }

  private static final HashMap<Integer, Flipper> flipperMap =
      new HashMap<Integer, Flipper>() {
        {
          put(2020, Flipper.ROTATE_AROUND);
          put(2021, Flipper.ROTATE_AROUND);
          put(2022, Flipper.ROTATE_AROUND);
          put(2023, Flipper.MIRRORED);
          put(2024, Flipper.MIRRORED);
        }
      };

  private static Flipper currentFlipper = Flipper.MIRRORED;

  public static Flipper getFlippingType() {
    return currentFlipper;
  }

  public static void setFieldDimensions(double length, double width) {
    fieldLength = length;
    fieldWidth = width;
  }

  /**
   * Set the year to determine the Alliance Coordinate Flipper to use.
   *
   * @param year The year to set the flipper to. [2020 - 2024]
   */
  public static void setYear(int year) {
    currentFlipper = flipperMap.getOrDefault(year, currentFlipper);
  }

  public static double flipX(double x) {
    return currentFlipper.getFlipper().flipX(x);
  }

  public static double flipY(double y) {
    return currentFlipper.getFlipper().flipY(y);
  }

  public static double flipHeading(double heading) {
    return currentFlipper.getFlipper().flipHeading(heading);
  }

  public static Translation2d flipTranslation(Translation2d translation) {
    return new Translation2d(flipX(translation.getX()), flipY(translation.getY()));
  }

  public static Rotation2d flipRotation(Rotation2d rotation) {
    return new Rotation2d(flipHeading(rotation.getRadians()));
  }

  public static Pose2d flipPose(Pose2d pose) {
    return new Pose2d(flipTranslation(pose.getTranslation()), flipRotation(pose.getRotation()));
  }
}
