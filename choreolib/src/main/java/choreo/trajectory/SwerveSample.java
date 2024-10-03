// Copyright (c) Choreo contributors

package choreo.trajectory;

import choreo.util.AllianceFlipUtil;
import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.util.struct.Struct;
import java.nio.ByteBuffer;
import java.util.Arrays;

/** A single robot sample in a Choreo Trajectory. */
public class SwerveSample implements TrajectorySample<SwerveSample> {
  private static final double[] EMPTY_MODULE_FORCES = new double[] {0, 0, 0, 0};

  /** The timestamp of this sample, relative to the beginning of the trajectory. */
  public final double t;

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
  private final double[] fx;

  /**
   * The force on each swerve module in the Y direction in Newtons Module forces appear in the
   * following order: [FL, FR, BL, BR].
   */
  private final double[] fy;

  /**
   * Constructs a SwerveSample with the specified parameters.
   *
   * @param t The timestamp of this sample, relative to the beginning of the trajectory.
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
   * @param moduleForcesY The force on each swerve module in the Y direction in Newtons.
   */
  public SwerveSample(
      double t,
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
    this.t = t;
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.vx = vx;
    this.vy = vy;
    this.omega = omega;
    this.ax = ax;
    this.ay = ay;
    this.alpha = alpha;
    this.fx = moduleForcesX;
    this.fy = moduleForcesY;
  }

  /**
   * A null safe getter for the module forces in the X direction.
   *
   * @return The module forces in the X direction.
   */
  public double[] moduleForcesX() {
    if (fx == null || fx.length != 4) {
      return EMPTY_MODULE_FORCES;
    }
    return fx;
  }

  /**
   * A null safe getter for the module forces in the Y direction.
   *
   * @return The module forces in the Y direction.
   */
  public double[] moduleForcesY() {
    if (fy == null || fy.length != 4) {
      return EMPTY_MODULE_FORCES;
    }
    return fy;
  }

  @Override
  public double getTimestamp() {
    return t;
  }

  @Override
  public Pose2d getPose() {
    return new Pose2d(x, y, Rotation2d.fromRadians(heading));
  }

  @Override
  public ChassisSpeeds getChassisSpeeds() {
    return new ChassisSpeeds(vx, vy, omega);
  }

  @Override
  public SwerveSample interpolate(SwerveSample endValue, double timestamp) {
    double scale = (timestamp - this.t) / (endValue.t - this.t);
    var interp_pose = getPose().interpolate(endValue.getPose(), scale);

    double[] interp_fx = new double[4];
    double[] interp_fy = new double[4];
    for (int i = 0; i < 4; ++i) {
      interp_fx[i] =
          MathUtil.interpolate(this.moduleForcesX()[i], endValue.moduleForcesX()[i], scale);
      interp_fy[i] =
          MathUtil.interpolate(this.moduleForcesY()[i], endValue.moduleForcesY()[i], scale);
    }

    return new SwerveSample(
        MathUtil.interpolate(this.t, endValue.t, scale),
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
        this.t + timestampOffset,
        this.x,
        this.y,
        this.heading,
        this.vx,
        this.vy,
        this.omega,
        this.ax,
        this.ay,
        this.alpha,
        this.moduleForcesX(),
        this.moduleForcesY());
  }

  @Override
  public SwerveSample flipped() {
    return switch (AllianceFlipUtil.getFlipper()) {
      case MIRRORED ->
          new SwerveSample(
              this.t,
              AllianceFlipUtil.flipX(this.x),
              this.y,
              Math.PI - this.heading,
              -this.vx,
              this.vy,
              -this.omega,
              -this.ax,
              this.ay,
              -this.alpha,
              // FL, BL, BR, FR
              // Flipped
              // -FR, -BR, -BL, -FR
              new double[] {
                -this.moduleForcesX()[3],
                -this.moduleForcesX()[2],
                -this.moduleForcesX()[1],
                -this.moduleForcesX()[0]
              },
              // FL, BL, BR, FR
              // Flipped
              // FR, BR, BL, FR
              new double[] {
                this.moduleForcesY()[3],
                this.moduleForcesY()[2],
                this.moduleForcesY()[1],
                this.moduleForcesY()[0]
              });
      case ROTATE_AROUND ->
          new SwerveSample(
              this.t,
              AllianceFlipUtil.flipX(this.x),
              AllianceFlipUtil.flipY(this.y),
              Math.PI - this.heading,
              -this.vx,
              -this.vy,
              -this.omega,
              -this.ax,
              -this.ay,
              -this.alpha,
              Arrays.stream(this.moduleForcesX()).map(x -> -x).toArray(),
              Arrays.stream(this.moduleForcesY()).map(y -> -y).toArray());
    };
  }

  @Override
  public SwerveSample[] makeArray(int length) {
    return new SwerveSample[length];
  }

  /** The struct for the SwerveSample class. */
  public static final Struct<SwerveSample> struct = new SwerveSampleStruct();

  private static final class SwerveSampleStruct implements Struct<SwerveSample> {
    @Override
    public Class<SwerveSample> getTypeClass() {
      return SwerveSample.class;
    }

    @Override
    public String getTypeString() {
      return "struct:SwerveSample";
    }

    @Override
    public int getSize() {
      return Struct.kSizeDouble * 18;
    }

    @Override
    public String getSchema() {
      return "double timestamp;"
          + "Pose2d pose;"
          + "double vx;"
          + "double vy;"
          + "double omega;"
          + "double ax;"
          + "double ay;"
          + "double alpha;"
          + "double moduleForcesX[4];"
          + "double moduleForcesY[4];";
    }

    @Override
    public Struct<?>[] getNested() {
      return new Struct<?>[] {Pose2d.struct};
    }

    @Override
    public SwerveSample unpack(ByteBuffer bb) {
      return new SwerveSample(
          bb.getDouble(),
          bb.getDouble(),
          bb.getDouble(),
          bb.getDouble(),
          bb.getDouble(),
          bb.getDouble(),
          bb.getDouble(),
          bb.getDouble(),
          bb.getDouble(),
          bb.getDouble(),
          new double[] {bb.getDouble(), bb.getDouble(), bb.getDouble(), bb.getDouble()},
          new double[] {bb.getDouble(), bb.getDouble(), bb.getDouble(), bb.getDouble()});
    }

    @Override
    public void pack(ByteBuffer bb, SwerveSample value) {
      bb.putDouble(value.t);
      bb.putDouble(value.x);
      bb.putDouble(value.y);
      bb.putDouble(value.heading);
      bb.putDouble(value.vx);
      bb.putDouble(value.vy);
      bb.putDouble(value.omega);
      bb.putDouble(value.ax);
      bb.putDouble(value.ay);
      bb.putDouble(value.alpha);
      for (int i = 0; i < 4; ++i) {
        bb.putDouble(value.moduleForcesX()[i]);
      }
      for (int i = 0; i < 4; ++i) {
        bb.putDouble(value.moduleForcesY()[i]);
      }
    }
  }
}
