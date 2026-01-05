// Copyright (c) Choreo contributors

package choreo.util;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Pose3d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Rotation3d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.geometry.Translation3d;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import java.util.Optional;
import java.util.function.DoubleUnaryOperator;
import java.util.function.Supplier;

/**
 * A utility to flip coordinates to the other alliance. Includes the ability to set custom flipping logic for fields other than the current FRC game.
 */
public class ChoreoAllianceFlipUtil {
  public static class Flipper {
    public final Symmetry symmetry;
    private final DoubleUnaryOperator flipX;
    public double flipX(double x) {
      return flipX.applyAsDouble(x);
    }
    private final DoubleUnaryOperator flipY;
    public double flipY(double y) {
      return flipY.applyAsDouble(y);
    }
    private final DoubleUnaryOperator flipHeading;
    public double flipHeading(double heading) {
      return flipHeading.applyAsDouble(heading);
    }
    public Flipper(Symmetry symmetry, DoubleUnaryOperator flipX, DoubleUnaryOperator flipY, DoubleUnaryOperator flipHeading) {
      this.symmetry = symmetry;
      this.flipX = flipX;
      this.flipY = flipY;
      this.flipHeading = flipHeading;
    }
    private static DoubleUnaryOperator IDENTITY = (arg)->arg;
    private static DoubleUnaryOperator NEGATE = (arg)->-arg;
    private static final double FT_54 = 16.4592;
    private static final double FT_27 = 16.4592/2;
    public static final Flipper ROTATED_2018 = Flipper.rotatedCenter(FT_54, FT_27); // 54 x 27 ft
    public static final Flipper ROTATED_2019 = Flipper.rotatedCenter(FT_54, FT_27);
    public static final Flipper ROTATED_2020 = Flipper.rotatedCenter(15.98295, 8.21055);
    public static final Flipper ROTATED_2022 = Flipper.rotatedCenter(FT_54, FT_27);
    public static final Flipper MIRRORED_2023 = Flipper.mirroredCenter(16.542);
    public static final Flipper MIRRORED_2024 = Flipper.mirroredCenter(16.542);
    public static final Flipper ROTATED_2025 = Flipper.rotatedCenter(17.548, 8.052);

    // TODO change
    // If we keep a name that is before M and R lexicographically, it shows up first in VSCode autocomplete for "Flipper."
    public static final Flipper DEFAULT = ROTATED_2025;
    /**
     * Mirror across the X=fieldLength/2 line.
     * @param fieldLength
     * @param fieldWidth
     * @return
     */
    public static Flipper mirroredCenter(double fieldLength) {
      return new Flipper(Symmetry.MIRRORED, x->fieldLength-x, IDENTITY, Symmetry.MIRRORED::flipHeading);
    }
    /**
     * Rotate half a rotation about (fieldLength/2, fieldWidth/2)
     * @param fieldLength
     * @param fieldWidth
     * @return
     */
    public static Flipper rotatedCenter(double fieldLength, double fieldWidth) {
      return new Flipper(Symmetry.ROTATE_AROUND, x->fieldLength-x, y->fieldWidth-y, Symmetry.ROTATE_AROUND::flipHeading);
    }
    /**
     * Rotate half a rotation about the origin
     * @return
     */
    public static Flipper rotatedOrigin() {
      return new Flipper(Symmetry.ROTATE_AROUND, NEGATE, NEGATE, Symmetry.ROTATE_AROUND::flipHeading);
    }
    /**
     * Mirror across the Y-axis (X=0) line.
     * @return
     */
    public static Flipper mirroredAcrossYAxis() {
      return new Flipper(Symmetry.MIRRORED, NEGATE, IDENTITY, Symmetry.MIRRORED::flipHeading);
    }
  }
  /** In MIRRORED symmetry, if the original robot translates DoubleUnaryOperatorin robot-relative +y (left),
   *  the mirrored robot translates robot-relative -y */
  public static enum Symmetry {
    /**
     * X becomes fieldLength - x, leaves the y coordinate unchanged, and heading becomes PI -
     * heading.
     */
    MIRRORED {
      public double flipHeading(double heading) {
        return Math.PI - heading;
      }
    },
    /** X becomes fieldLength - x, Y becomes fieldWidth - y, and heading becomes PI - heading. */
    ROTATE_AROUND {
      public double flipHeading(double heading) {
        return Math.PI + heading;
      }
    };

    /**
     * Flips the heading.
     *
     * @param heading The heading to flip.
     * @return The flipped heading.
     */
    public abstract double flipHeading(double heading);
  }

  /** Default constructor. */
  private ChoreoAllianceFlipUtil() {}

  private static Flipper activeFlipper = Flipper.DEFAULT;
  /**
   * Get the flipper that is currently active for flipping coordinates. It's recommended not to
   * store this locally as the flipper may change.
   *
   * @return The active flipper.
   */
  public static Flipper getFlipper() {
    return activeFlipper;
  }
  /**
   * Set the flipper used throughout the library. Recommended to set this as early as possible in robot code startup.
   */
  public static void setFlipper(Flipper flipper) {
    activeFlipper = flipper;
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
   * Flips the X coordinate.
   *
   * @param x The X coordinate to flip.
   * @return The flipped X coordinate.
   */
  public static double flipX(double x) {
    return getFlipper().flipX(x);
  }

  /**
   * Flips the Y coordinate.
   *
   * @param y The Y coordinate to flip.
   * @return The flipped Y coordinate.
   */
  public static double flipY(double y) {
    return getFlipper().flipY(y);
  }

  /**
   * Flips the heading.
   *
   * @param heading The heading to flip.
   * @return The flipped heading.
   */
  public static double flipHeading(double heading) {
    return getFlipper().flipHeading(heading);
  }

  /**
   * Flips the translation.
   *
   * @param translation The translation to flip.
   * @return The flipped translation.
   */
  public static Translation2d flip(Translation2d translation) {
    return new Translation2d(flipX(translation.getX()), flipY(translation.getY()));
  }

  /**
   * Flips the rotation.
   *
   * @param rotation The rotation to flip.
   * @return The flipped rotation.
   */
  public static Rotation2d flip(Rotation2d rotation) {
    return switch (getFlipper().symmetry) {
      case MIRRORED -> new Rotation2d(-rotation.getCos(), rotation.getSin());
      case ROTATE_AROUND -> new Rotation2d(-rotation.getCos(), -rotation.getSin());
    };
  }

  /**
   * Flips the pose.
   *
   * @param pose The pose to flip.
   * @return The flipped pose.
   */
  public static Pose2d flip(Pose2d pose) {
    return new Pose2d(flip(pose.getTranslation()), flip(pose.getRotation()));
  }

  /**
   * Flips the translation.
   *
   * @param translation The translation to flip.
   * @return The flipped translation.
   */
  public static Translation3d flip(Translation3d translation) {
    return new Translation3d(
        flipX(translation.getX()), flipY(translation.getY()), translation.getZ());
  }

  /**
   * Flips the rotation.
   *
   * @param rotation The rotation to flip.
   * @return The flipped rotation.
   */
  public static Rotation3d flip(Rotation3d rotation) {
    return new Rotation3d(
        rotation.getX(), rotation.getY(), flip(rotation.toRotation2d()).getRadians());
  }

  /**
   * Flips the pose.
   *
   * @param pose The pose to flip.
   * @return The flipped pose.
   */
  public static Pose3d flip(Pose3d pose) {
    return new Pose3d(flip(pose.getTranslation()), flip(pose.getRotation()));
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
    return () ->
        doFlip
            ? allianceOpt
                .get()
                .flatMap(ally -> poseOpt.map(pose -> ally == Alliance.Red ? flip(pose) : pose))
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
    return () ->
        doFlip
            ? allianceOpt
                .get()
                .flatMap(
                    ally ->
                        translationOpt.map(
                            translation -> ally == Alliance.Red ? flip(translation) : translation))
            : translationOpt;
  }
}
