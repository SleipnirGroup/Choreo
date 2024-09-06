// Copyright (c) Choreo contributors

package choreo.trajectory;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.interpolation.Interpolatable;
import edu.wpi.first.math.kinematics.ChassisSpeeds;

/** The generic interface for a sample in a trajectory. */
public interface TrajSample<Self extends TrajSample<?>> extends Interpolatable<Self> {
  /**
   * Returns the timestamp of this sample.
   *
   * @return the timestamp of this sample.
   */
  double getTimestamp();

  /**
   * Returns the pose at this sample.
   *
   * @return the pose at this sample.
   */
  Pose2d getPose();

  /**
   * Returns the field-relative chassis speeds of this sample.
   *
   * @return the field-relative chassis speeds of this sample.
   */
  ChassisSpeeds getChassisSpeeds();

  /**
   * Returns this sample, mirrored across the field midline.
   *
   * @return this sample, mirrored across the field midline.
   */
  Self flipped();

  Self offsetBy(double timestampOffset);
}
