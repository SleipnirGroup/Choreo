// Copyright (c) Choreo contributors

package choreo.trajectory;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.interpolation.Interpolatable;
import edu.wpi.first.math.kinematics.ChassisSpeeds;

/** A single robot state in a ChoreoTrajectory. */
public class ChoreoTrajectoryState implements Interpolatable<ChoreoTrajectoryState> {
  private static final double FIELD_LENGTH_METERS = 16.5410515;

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
   * Constructs a ChoreoTrajectoryState with the specified parameters.
   *
   * @param timestamp The timestamp of this state, relative to the beginning of the trajectory.
   * @param x The X position of the state in meters.
   * @param y The Y position of the state in meters.
   * @param heading The heading of the state in radians, with 0 being in the +X direction.
   * @param velocityX The velocity of the state in the X direction in m/s.
   * @param velocityY The velocity of the state in the X direction in m/s.
   * @param angularVelocity The angular velocity of the state in rad/s.
   */
  public ChoreoTrajectoryState(
      double timestamp,
      double x,
      double y,
      double heading,
      double velocityX,
      double velocityY,
      double angularVelocity) {
    this.timestamp = timestamp;
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.angularVelocity = angularVelocity;
  }

  /**
   * Returns the pose at this state.
   *
   * @return the pose at this state.
   */
  public Pose2d getPose() {
    return new Pose2d(x, y, Rotation2d.fromRadians(heading));
  }

  /**
   * Returns the field-relative chassis speeds of this state.
   *
   * @return the field-relative chassis speeds of this state.
   */
  public ChassisSpeeds getChassisSpeeds() {
    return new ChassisSpeeds(velocityX, velocityY, angularVelocity);
  }

  /**
   * Interpolate between this state and the provided state.
   *
   * @param endValue The next state. It should have a timestamp after this state.
   * @param timestamp the timestamp of the interpolated state. It should be between this state and
   *     endValue.
   * @return the interpolated state.
   */
  @Override
  public ChoreoTrajectoryState interpolate(ChoreoTrajectoryState endValue, double timestamp) {
    double scale = (timestamp - this.timestamp) / (endValue.timestamp - this.timestamp);
    var interp_pose = getPose().interpolate(endValue.getPose(), scale);

    return new ChoreoTrajectoryState(
        MathUtil.interpolate(this.timestamp, endValue.timestamp, scale),
        interp_pose.getX(),
        interp_pose.getY(),
        interp_pose.getRotation().getRadians(),
        MathUtil.interpolate(this.velocityX, endValue.velocityX, scale),
        MathUtil.interpolate(this.velocityY, endValue.velocityY, scale),
        MathUtil.interpolate(this.angularVelocity, endValue.angularVelocity, scale));
  }

  /**
   * Returns this state as a double array: {timestamp, x, y, heading, velocityX, velocityY,
   * angularVelocity}.
   *
   * @return This state as a double array: {timestamp, x, y, heading, velocityX, velocityY,
   *     angularVelocity}.
   */
  public double[] asArray() {
    return new double[] {
      timestamp, x, y, heading, velocityX, velocityY, angularVelocity,
    };
  }

  /**
   * Returns this state, mirrored across the field midline.
   *
   * @return this state, mirrored across the field midline.
   */
  public ChoreoTrajectoryState flipped() {
    return new ChoreoTrajectoryState(
        this.timestamp,
        FIELD_LENGTH_METERS - this.x,
        this.y,
        Math.PI - this.heading,
        -this.velocityX,
        this.velocityY,
        -this.angularVelocity);
  }
}
