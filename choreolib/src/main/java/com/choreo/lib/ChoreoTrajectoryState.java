// Copyright (c) Choreo contributors

package com.choreo.lib;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.interpolation.Interpolatable;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import lombok.Builder;

/** A single robot state in a ChoreoTrajectory. */
@Builder
public class ChoreoTrajectoryState implements Interpolatable<ChoreoTrajectoryState> {
  private static final double FIELD_WIDTH_METERS = 16.55445;

  /** The timestamp of this state, relative to the beginning of the trajectory. */
  public final double timestamp;

  /** The X position of the state in meters. */
  public final double x;

  /** The Y position of the state in meters. */
  public final double y;

  /** The heading of the state in radians, with 0 being in the +X direction. */
  public final double heading;

  /** The velocity of the state in the X direction in m/s. */
  public final double velocityX;

  /** The velocity of the state in the X direction in m/s. */
  public final double velocityY;

  /** The angular velocity of the state in rad/s. */
  public final double angularVelocity;

  /**
   * @return the pose at this state.
   */
  public Pose2d getPose() {
    return new Pose2d(x, y, Rotation2d.fromRadians(heading));
  }

  /**
   * @return the field-relative chassis speeds of this state.
   */
  public ChassisSpeeds getChassisSpeeds() {
    return new ChassisSpeeds(velocityX, velocityY, angularVelocity);
  }

  /**
   * Interpolate between this state and the provided state.
   *
   * @param endValue The next state. It should have a timestamp after this state.
   * @param t the timestamp of the interpolated state. It should be between this state and endValue.
   * @return the interpolated state.
   */
  @Override
  public ChoreoTrajectoryState interpolate(ChoreoTrajectoryState endValue, double t) {
    double scale = (t - this.timestamp) / (endValue.timestamp - this.timestamp);
    var interp_pose = getPose().interpolate(endValue.getPose(), scale);

    return ChoreoTrajectoryState.builder()
        .x(interp_pose.getX())
        .y(interp_pose.getY())
        .heading(interp_pose.getRotation().getRadians())
        .velocityX(MathUtil.interpolate(this.velocityX, endValue.velocityX, scale))
        .velocityY(MathUtil.interpolate(this.velocityY, endValue.velocityY, scale))
        .angularVelocity(
            MathUtil.interpolate(this.angularVelocity, endValue.angularVelocity, scale))
        .build();
  }

  /**
   * @return this state as a double array: {timestamp, x, y, heading, velocityX, velocityY,
   *     angularVelocity}
   */
  public double[] asArray() {
    return new double[] {
      timestamp, x, y, heading, velocityX, velocityY, angularVelocity,
    };
  }

  /**
   * @return this state, mirrored across the field midline.
   */
  public ChoreoTrajectoryState flipped() {
    return ChoreoTrajectoryState.builder()
        .x(FIELD_WIDTH_METERS - this.x)
        .y(this.y)
        .heading(Math.PI - this.heading)
        .velocityX(this.velocityX * -1)
        .velocityY(this.velocityY)
        .angularVelocity(this.angularVelocity * -1)
        .timestamp(this.timestamp)
        .build();
  }
}
