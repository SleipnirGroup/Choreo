// Copyright (c) Choreo contributors

package choreo.util;

import static choreo.util.FieldDimensions.FIELD_LENGTH;
import static choreo.util.FieldDimensions.FIELD_WIDTH;

import choreo.trajectory.DifferentialSample;
import choreo.trajectory.SwerveSample;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Pose3d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Rotation3d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.geometry.Translation3d;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * A utility to standardize flipping of coordinate data based on the current alliance across
 * different years.
 *
 * <p>If every vendor used this, the user would be able to specify the year and no matter the year
 * the vendor's code is from, the user would be able to flip as expected.
 *
 * <p>This API still allows vendors and users to match case against the flipping variant as a way to
 * specially handle cases or throw errors if a variant is explicitly not supported.
 */
public class ChoreoAllianceFlipUtil {
  /** The flipper to use for flipping coordinates. */
  public abstract static class Flipper {
    /**
     * X becomes fieldLength - x, leaves the y coordinate unchanged, and heading becomes PI -
     * heading.
     */
    abstract static class MirroredX extends Flipper {
      public double flipX(double x) {
        return getFieldLength() - x;
      }

      public double flipY(double y) {
        return y;
      }

      public double flipHeading(double heading) {
        return Math.PI - heading;
      }

      public Rotation2d flip(Rotation2d rotation) {
        return new Rotation2d(-rotation.getCos(), rotation.getSin());
      }

      public SwerveSample flip(SwerveSample sample) {
        return new SwerveSample(
            sample.t,
            flipX(sample.x),
            flipY(sample.y),
            flipHeading(sample.heading),
            -sample.vx,
            sample.vy,
            -sample.omega,
            -sample.ax,
            sample.ay,
            -sample.alpha,
            // FL, FR, BL, BR
            // Mirrored
            // -FR, -FL, -BR, -BL
            new double[] {
              -sample.moduleForcesX()[1],
              -sample.moduleForcesX()[0],
              -sample.moduleForcesX()[3],
              -sample.moduleForcesX()[2]
            },
            // FL, FR, BL, BR
            // Mirrored
            // FR, FL, BR, BL
            new double[] {
              sample.moduleForcesY()[1],
              sample.moduleForcesY()[0],
              sample.moduleForcesY()[3],
              sample.moduleForcesY()[2]
            });
      }

      public DifferentialSample flip(DifferentialSample sample) {
        return new DifferentialSample(
            sample.t,
            flipX(sample.x),
            flipY(sample.y), // No-op for mirroring
            flipHeading(sample.heading),
            sample.vr,
            sample.vl,
            -sample.omega,
            sample.ar,
            sample.al,
            -sample.alpha,
            sample.fr,
            sample.fl);
      }
    }

    /** Creates a new flipper that mirrors across x=fieldLength/2.
     * This is intended for alliance-based flipping in rotationally asymmetric games.
     * @param fieldLength The length of the field.
     * @param fieldWidth The width of the field.
     * @return a new flipper.
     */
    public static MirroredX mirroredX(double fieldLength, double fieldWidth) {
      return new MirroredX() {
        public double getFieldLength() {
          return fieldLength;
        }

        public double getFieldWidth() {
          return fieldWidth;
        }
      };
    }

    /**
     * More used for left-right variants on the same alliance. X is unchanged, Y becomes
     * fieldWidth-y, and heading becomes -heading.
     */
    abstract static class MirroredY extends Flipper {
      public double flipX(double x) {
        return x;
      }

      public double flipY(double y) {
        return getFieldWidth() - y;
      }

      public double flipHeading(double heading) {
        return -heading;
      }

      public Rotation2d flip(Rotation2d rotation) {
        return new Rotation2d(rotation.getCos(), -rotation.getSin());
      }

      @Override
      public SwerveSample flip(SwerveSample sample) {
        return new SwerveSample(
            sample.t,
            flipX(sample.x),
            flipY(sample.y),
            flipHeading(sample.heading),
            sample.vx,
            -sample.vy,
            -sample.omega,
            sample.ax,
            -sample.ay,
            -sample.alpha,
            // FL, FR, BL, BR
            // Mirrored
            // FR, FL, BR, BL
            new double[] {
              sample.moduleForcesX()[1],
              sample.moduleForcesX()[0],
              sample.moduleForcesX()[3],
              sample.moduleForcesX()[2]
            },
            // FL, FR, BL, BR
            // Mirrored
            // -FR, -FL, -BR, -BL
            new double[] {
              -sample.moduleForcesY()[1],
              -sample.moduleForcesY()[0],
              -sample.moduleForcesY()[3],
              -sample.moduleForcesY()[2]
            });
      }

      @Override
      public DifferentialSample flip(DifferentialSample sample) {
        return new DifferentialSample(
            sample.t,
            flipX(sample.x),
            flipY(sample.y), // No-op for mirroring
            flipHeading(sample.heading),
            sample.vr,
            sample.vl,
            -sample.omega,
            sample.ar,
            sample.al,
            -sample.alpha,
            sample.fr,
            sample.fl);
      }
    }

    /** Creates a new flipper that mirrors across y=fieldWidth/2.
     * This keeps the positions on the same alliance half, but can be used to mirror left and right sides of the field, from driver perspective.
     * @param fieldLength The length of the field.
     * @param fieldWidth The width of the field.
     * @return a new flipper.
     */
    public static MirroredY mirroredY(double fieldLength, double fieldWidth) {
      return new MirroredY() {
        public double getFieldLength() {
          return fieldLength;
        }

        public double getFieldWidth() {
          return fieldWidth;
        }
      };
    }

    /** X becomes fieldLength - x, Y becomes fieldWidth - y, and heading becomes PI + heading. */
    abstract static class RotatedAround extends Flipper {
      MirroredX mirrorX = mirroredX(getFieldLength(), getFieldWidth());
      MirroredY mirrorY = mirroredY(getFieldLength(), getFieldWidth());

      public double flipX(double x) {
        return mirrorX.flipX(mirrorY.flipX(x));
      }

      public double flipY(double y) {
        return mirrorX.flipY(mirrorY.flipY(y));
      }

      public double flipHeading(double heading) {
        return mirrorX.flipHeading(mirrorY.flipHeading(heading));
      }

      public Rotation2d flip(Rotation2d rotation) {
        return new Rotation2d(-rotation.getCos(), -rotation.getSin());
      }

      @Override
      public SwerveSample flip(SwerveSample sample) {
        return new SwerveSample(
            sample.t,
            flipX(sample.x),
            flipY(sample.y),
            flipHeading(sample.heading),
            -sample.vx,
            -sample.vy,
            sample.omega,
            -sample.ax,
            -sample.ay,
            sample.alpha,
            new double[] {
              -sample.moduleForcesX()[0],
              -sample.moduleForcesX()[1],
              -sample.moduleForcesX()[2],
              -sample.moduleForcesX()[3]
            },
            new double[] {
              -sample.moduleForcesY()[0],
              -sample.moduleForcesY()[1],
              -sample.moduleForcesY()[2],
              -sample.moduleForcesY()[3]
            });
      }

      @Override
      public DifferentialSample flip(DifferentialSample sample) {
        return new DifferentialSample(
            sample.t,
            flipX(sample.x),
            flipY(sample.y),
            flipHeading(sample.heading),
            sample.vl,
            sample.vr,
            sample.omega,
            sample.al,
            sample.ar,
            sample.alpha,
            sample.fl,
            sample.fr);
      }
    }
    ;

    /** Creates a new rotated flipper around the center of the field.
     * This is intended for alliance-based flipping in rotationally symmetric games.
     * @param fieldLength The length of the field.
     * @param fieldWidth The width of the field.
     * @return A new rotated flipper around the center of the field.
     */
    public static RotatedAround rotatedAround(double fieldLength, double fieldWidth) {
      return new RotatedAround() {
        public double getFieldLength() {
          return fieldLength;
        }

        public double getFieldWidth() {
          return fieldWidth;
        }
      };
    }

    // ***** Class Definition *****/

    /** @return the length (X axis) of the field. */
    public abstract double getFieldLength();
    /** @return the width (Y axis) of the field. */
    public abstract double getFieldWidth();

    /**
     * Flips the X coordinate.
     *
     * @param x The X coordinate to flip.
     * @return The flipped X coordinate.
     */
    public abstract double flipX(double x);

    /**
     * Flips the Y coordinate.
     *
     * @param y The Y coordinate to flip.
     * @return The flipped Y coordinate.
     */
    public abstract double flipY(double y);

    /**
     * Flips the heading.
     *
     * @param heading The heading to flip.
     * @return The flipped heading.
     */
    public abstract double flipHeading(double heading);

    /**
     * Flips a Rotation2d.
     *
     * @param rotation the Rotation2d to flip.
     * @return The flipped Rotation2d.
     */
    public abstract Rotation2d flip(Rotation2d rotation);

    /**
     * Flips a SwerveSample.
     *
     * @param sample The SwerveSample to flip.
     * @return The flipped SwerveSample.
     */
    public abstract SwerveSample flip(SwerveSample sample);
    /**
     * Flips a DifferentialSample.
     *
     * @param sample The DifferentialSample to flip.
     * @return The flipped DifferentialSample.
     */
    public abstract DifferentialSample flip(DifferentialSample sample);

    /**
     * Flips a Translation2d.
     *
     * @param translation the Translation2d to flip.
     * @return The flipped Translation2d.
     */
    public Translation2d flip(Translation2d translation) {
      return new Translation2d(flipX(translation.getX()), flipY(translation.getY()));
    }

    /**
     * Flips the pose.
     *
     * @param pose The pose to flip.
     * @return The flipped pose.
     */
    public Pose2d flip(Pose2d pose) {
      return new Pose2d(flip(pose.getTranslation()), flip(pose.getRotation()));
    }

    /**
     * Flips the translation.
     *
     * @param translation The translation to flip.
     * @return The flipped translation.
     */
    public Translation3d flip(Translation3d translation) {
      return new Translation3d(
          flipX(translation.getX()), flipY(translation.getY()), translation.getZ());
    }

    /**
     * Flips the rotation.
     *
     * @param rotation The rotation to flip.
     * @return The flipped rotation.
     */
    public Rotation3d flip(Rotation3d rotation) {
      return new Rotation3d(
          rotation.getX(), rotation.getY(), flip(rotation.toRotation2d()).getRadians());
    }

    /**
     * Flips the pose.
     *
     * @param pose The pose to flip.
     * @return The flipped pose.
     */
    public Pose3d flip(Pose3d pose) {
      return new Pose3d(flip(pose.getTranslation()), flip(pose.getRotation()));
    }
    /** The default flipper for the current FRC year. */
    public static Flipper FRC_CURRENT = rotatedAround(FIELD_LENGTH, FIELD_WIDTH);
  }

  private static Flipper activeAllianceFlip;
  private static Flipper activeMirrorY;
  private static Flipper activeMirrorX;

  static {
    setFlipper(Flipper.FRC_CURRENT);
  }

  /** Default constructor. */
  private ChoreoAllianceFlipUtil() {}

  /**
   * Get the flipper that is currently active for alliance-based flipping. It's recommended not to
   * store this locally as the flipper may change.
   *
   * @return The active flipper.
   */
  public static Flipper getFlipper() {
    return activeAllianceFlip;
  }

  /**
   * Get the flipper that is currently active for mirroring across the Y axis. It's recommended not
   * to store this locally as the flipper may change.
   *
   * @return The active mirror Y flipper.
   */
  public static Flipper getMirrorX() {
    return activeMirrorX;
  }

  /**
   * Get the flipper that is currently active for mirroring across the X axis. It's recommended not
   * to store this locally as the flipper may change.
   *
   * @return The active mirror X flipper.
   */
  public static Flipper getMirrorY() {
    return activeMirrorY;
  }

  /**
   * Returns if you are on red alliance.
   *
   * @return If you are on red alliance.
   */
  public static boolean shouldFlip() {
    return DriverStation.getAlliance().orElse(Alliance.Blue) == Alliance.Red;
  }

  /**
   * Sets the flipper to use for alliance-based flipping. This will also set the mirror flippers based on the new flipper.
   * You should only need to do this if you want to change the flipping behavior from the default, which is set based on the field dimensions and symmetry for the current FRC year.
   * It's recommended to call this in a static block in Robot or equivalent so that it's set before any flipping is done.
   * @param flipper The new flipper to use for alliance-based flipping.
   */
  public static void setFlipper(Flipper flipper) {
    activeAllianceFlip = flipper;
    activeMirrorY = Flipper.mirroredY(flipper.getFieldLength(), flipper.getFieldWidth());
    activeMirrorX = Flipper.mirroredX(flipper.getFieldLength(), flipper.getFieldWidth());
  }

  /**
   * Flips the X coordinate to the other alliance.
   *
   * @param x The X coordinate to flip.
   * @return The flipped X coordinate.
   */
  public static double flipX(double x) {
    return activeAllianceFlip.flipX(x);
  }

  /**
   * Flips the Y coordinate to the other alliance.
   *
   * @param y The Y coordinate to flip.
   * @return The flipped Y coordinate.
   */
  public static double flipY(double y) {
    return activeAllianceFlip.flipY(y);
  }

  /**
   * Flips the heading to the other alliance.
   *
   * @param heading The heading to flip.
   * @return The flipped heading.
   */
  public static double flipHeading(double heading) {
    return activeAllianceFlip.flipHeading(heading);
  }

  /**
   * Flips the translation to the other alliance.
   *
   * @param translation The translation to flip.
   * @return The flipped translation.
   */
  public static Translation2d flip(Translation2d translation) {
    return activeAllianceFlip.flip(translation);
  }

  /**
   * Flips the rotation to the other alliance.
   *
   * @param rotation The rotation to flip.
   * @return The flipped rotation.
   */
  public static Rotation2d flip(Rotation2d rotation) {
    return activeAllianceFlip.flip(rotation);
  }

  /**
   * Flips the pose to the other alliance.
   *
   * @param pose The pose to flip.
   * @return The flipped pose.
   */
  public static Pose2d flip(Pose2d pose) {
    return activeAllianceFlip.flip(pose);
  }

  /**
   * Flips the translation to the other alliance.
   *
   * @param translation The translation to flip.
   * @return The flipped translation.
   */
  public static Translation3d flip(Translation3d translation) {
    return activeAllianceFlip.flip(translation);
  }

  /**
   * Flips the rotation to the other alliance.
   *
   * @param rotation The rotation to flip.
   * @return The flipped rotation.
   */
  public static Rotation3d flip(Rotation3d rotation) {
    return activeAllianceFlip.flip(rotation);
  }

  /**
   * Flips the pose to the other alliance.
   *
   * @param pose The pose to flip.
   * @return The flipped pose.
   */
  public static Pose3d flip(Pose3d pose) {
    return activeAllianceFlip.flip(pose);
  }

  /**
   * Flips the swerve sample to the other alliance.
   *
   * @param sample The swerve sample to flip.
   * @return The flipped swerve sample.
   */
  public static SwerveSample flip(SwerveSample sample) {
    return activeAllianceFlip.flip(sample);
  }

  /**
   * Flips the differential sample to the other alliance.
   *
   * @param sample The differential sample to flip.
   * @return The flipped differential sample.
   */
  public static DifferentialSample flip(DifferentialSample sample) {
    return activeAllianceFlip.flip(sample);
  }

  /**
   * Creates a Supplier&lt;Optional&lt;Pose2d&gt;&gt; based on a
   * Supplier&lt;Optional&lt;Alliance&gt;&gt; and original Optional&lt;Pose2d&gt;
   *
   * @param poseOpt The pose to flip
   * @param allianceOpt The current alliance
   * @param doFlip Returns true if flipping based on the alliance should be done
   * @return empty if the alliance is empty; the original pose optional if the alliance is blue or
   *     doFlip is false; the flipped pose optional if the alliance is red and doFlip is true
   */
  public static Supplier<Optional<Pose2d>> optionalFlippedPose2d(
      Optional<Pose2d> poseOpt, Supplier<Optional<Alliance>> allianceOpt, boolean doFlip) {
    if (poseOpt.isEmpty()) {
      return () -> Optional.empty();
    }
    Optional<Pose2d> flippedPose = poseOpt.map(ChoreoAllianceFlipUtil::flip);

    return () ->
        doFlip
            ? allianceOpt.get().flatMap(ally -> ally == Alliance.Red ? flippedPose : poseOpt)
            : poseOpt;
  }

  /**
   * Creates a Supplier&lt;Optional&lt;Translation2d&gt;&gt; that is flipped based on a
   * Supplier&lt;Optional&lt;Alliance&gt;&gt; and original Optional&lt;Translation2d&gt;
   *
   * @param translationOpt The translation to flip
   * @param allianceOpt The current alliance
   * @param doFlip Returns true if flipping based on the alliance should be done
   * @return empty if the alliance is empty; the original translation optional if the alliance is
   *     blue or doFlip is false; the flipped translation optional if the alliance is red and doFlip
   *     is true
   */
  public static Supplier<Optional<Translation2d>> optionalFlippedTranslation2d(
      Optional<Translation2d> translationOpt,
      Supplier<Optional<Alliance>> allianceOpt,
      boolean doFlip) {
    if (translationOpt.isEmpty()) {
      return () -> Optional.empty();
    }
    Optional<Translation2d> flippedTranslation = translationOpt.map(ChoreoAllianceFlipUtil::flip);

    return () ->
        doFlip
            ? allianceOpt
                .get()
                .flatMap(ally -> ally == Alliance.Red ? flippedTranslation : translationOpt)
            : translationOpt;
  }
}
