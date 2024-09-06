// Copyright (c) Choreo contributors

package choreo.trajectory;

import choreo.util.AllianceFlipUtil;
import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import java.util.Arrays;

/** A single robot sample in a ChoreoTrajectory. */
public class SwerveSample implements TrajSample<SwerveSample> {
  /** The timestamp of this sample, relative to the beginning of the trajectory. */
  public final double timestamp;

  /** The X position of the sample in meters. */
  public final double x;

  /** The Y position of the sample in meters. */
  public final double y;

  /** The heading of the sample in radians, with 0 being in the +X direction. */
  public final double heading;

  /** The velocity of the sample in the X direction in m/s. */
  public final double vx;

  /** The velocity of the sample in the Y direction in m/s. */
  public final double vy;

  /** The angular velocity of the sample in rad/s. */
  public final double omega;

  /** The acceleration of the in the X direction in m/s^2 */
  public final double ax;

  /** The acceleration of the in the Y direction in m/s^2 */
  public final double ay;

  /** The angular acceleration of the sample in rad/s^2 */
  public final double alpha;

  /**
   * The force on each swerve module in the X direction in Newtons. Module forces appear in the
   * following order: [FL, FR, BL, BR].
   */
  public final double[] moduleForcesX;

  /**
   * The force on each swerve module in the Y direction in Newtons Module forces appear in the
   * following order: [FL, FR, BL, BR].
   */
  public final double[] moduleForcesY;

  /**
   * Constructs a SwerveSample with the specified parameters.
   *
   * @param timestamp The timestamp of this sample, relative to the beginning of the trajectory.
   * @param x The X position of the sample in meters.
   * @param y The Y position of the sample in meters.
   * @param heading The heading of the sample in radians, with 0 being in the +X direction.
   * @param vx The velocity of the sample in the X direction in m/s.
   * @param vy The velocity of the sample in the Y direction in m/s.
   * @param omega The angular velocity of the sample in rad/s.
   * @param ax The acceleration of the sample in the X direction in m/s^2.
   * @param ay The acceleration of the sample in the Y direction in m/s^2.
   * @param alpha The angular acceleration of the sample in rad/s^2.
   * @param moduleForcesX The force on each swerve module in the X direction in Newtons.
   * @param moduleForcesY The force on each swerve module in the Y direction in Netwons.
   */
  public SwerveSample(
      double timestamp,
      double x,
      double y,
      double heading,
      double vx,
      double vy,
      double omega,
      double ax,
      double ay,
      double alpha,
      double[] moduleForcesX,
      double[] moduleForcesY) {
    this.timestamp = timestamp;
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.vx = vx;
    this.vy = vy;
    this.omega = omega;
    this.ax = ax;
    this.ay = ay;
    this.alpha = alpha;
    this.moduleForcesX = moduleForcesX;
    this.moduleForcesY = moduleForcesY;
  }

  /**
   * Returns the timestamp of this sample.
   *
   * @return the timestamp of this sample.
   */
  @Override
  public double getTimestamp() {
    return timestamp;
  }

  /**
   * Returns the pose at this sample.
   *
   * @return the pose at this sample.
   */
  @Override
  public Pose2d getPose() {
    return new Pose2d(x, y, Rotation2d.fromRadians(heading));
  }

  /**
   * Returns the field-relative chassis speeds of this sample.
   *
   * @return the field-relative chassis speeds of this sample.
   */
  public ChassisSpeeds getChassisSpeeds() {
    return new ChassisSpeeds(vx, vy, omega);
  }

  /**
   * Interpolate between this sample and the provided sample.
   *
   * @param endValue The next sample. It should have a timestamp after this sample.
   * @param timestamp the timestamp of the interpolated sample. It should be between this sample and
   *     endValue.
   * @return the interpolated sample.
   */
  @Override
  public SwerveSample interpolate(SwerveSample endValue, double timestamp) {
    double scale = (timestamp - this.timestamp) / (endValue.timestamp - this.timestamp);
    var interp_pose = getPose().interpolate(endValue.getPose(), scale);

    // NOTE: Could maybe do this with streams? This seems more efficient for now.
    double[] interp_fx = new double[4];
    double[] interp_fy = new double[4];
    for (int i = 0; i < 4; ++i) {
      interp_fx[i] = MathUtil.interpolate(this.moduleForcesX[i], endValue.moduleForcesX[i], scale);
      interp_fy[i] = MathUtil.interpolate(this.moduleForcesY[i], endValue.moduleForcesY[i], scale);
    }

    return new SwerveSample(
        MathUtil.interpolate(this.timestamp, endValue.timestamp, scale),
        interp_pose.getX(),
        interp_pose.getY(),
        interp_pose.getRotation().getRadians(),
        MathUtil.interpolate(this.vx, endValue.vx, scale),
        MathUtil.interpolate(this.vy, endValue.vy, scale),
        MathUtil.interpolate(this.omega, endValue.omega, scale),
        MathUtil.interpolate(this.ax, endValue.ax, scale),
        MathUtil.interpolate(this.ay, endValue.ay, scale),
        MathUtil.interpolate(this.alpha, endValue.alpha, scale),
        interp_fx,
        interp_fy);
  }

  @Override
  public SwerveSample offsetBy(double timestampOffset) {
    return new SwerveSample(
        this.timestamp + timestampOffset,
        this.x,
        this.y,
        this.heading,
        this.vx,
        this.vy,
        this.omega,
        this.ax,
        this.ay,
        this.alpha,
        this.moduleForcesX,
        this.moduleForcesY);
  }

  public SwerveSample flipped() {
    switch (AllianceFlipUtil.getFlippingType()) {
      case MIRRORED:
        return new SwerveSample(
            this.timestamp,
            AllianceFlipUtil.flipX(this.x),
            this.y,
            Math.PI - this.heading,
            -this.vx,
            this.vy,
            -this.omega,
            -this.ax,
            this.ay,
            -this.alpha,
            Arrays.stream(this.moduleForcesX).map(x -> -x).toArray(),
            this.moduleForcesY);
      case ROTATE_AROUND:
        return new SwerveSample(
            this.timestamp,
            AllianceFlipUtil.flipX(this.x),
            AllianceFlipUtil.flipY(this.y),
            Math.PI - this.heading,
            -this.vx,
            -this.vy,
            -this.omega,
            -this.ax,
            -this.ay,
            -this.alpha,
            Arrays.stream(this.moduleForcesX).map(x -> -x).toArray(),
            Arrays.stream(this.moduleForcesY).map(y -> -y).toArray());
      default:
        return this;
    }
  }
}
