// Copyright (c) Choreo contributors

package choreo.trajectory;

import choreo.util.ChoreoAllianceFlipUtil;
import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.Matrix;
import edu.wpi.first.math.VecBuilder;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.numbers.N1;
import edu.wpi.first.math.numbers.N2;
import edu.wpi.first.math.numbers.N6;
import edu.wpi.first.math.system.NumericalIntegration;
import edu.wpi.first.util.struct.Struct;
import java.nio.ByteBuffer;
import java.util.function.BiFunction;

/** A single differential drive robot sample in a Trajectory. */
public class DifferentialSample implements TrajectorySample<DifferentialSample> {
  /** The timestamp of this sample relative to the beginning of the trajectory. */
  public final double t;

  /** The X position of the sample relative to the blue alliance wall origin in meters. */
  public final double x;

  /** The Y position of the sample relative to the blue alliance wall origin in meters. */
  public final double y;

  /** The heading of the sample in radians, with 0 being in the +X direction. */
  public final double heading;

  /** The velocity of the left side in m/s. */
  public final double vl;

  /** The velocity of the right side in m/s. */
  public final double vr;

  /** The chassis angular velocity in rad/s. */
  public final double omega;

  /** The acceleration of the left side in m/s². */
  public final double al;

  /** The acceleration of the right side in m/s². */
  public final double ar;

  /** The force of the left side in Newtons. */
  public final double fl;

  /** The force of the right side in Newtons. */
  public final double fr;

  /**
   * Constructs a DifferentialSample with the specified parameters.
   *
   * @param timestamp The timestamp of this sample.
   * @param x The X position of the sample in meters.
   * @param y The Y position of the sample in meters.
   * @param heading The heading of the sample in radians, with 0 being in the +X direction.
   * @param vl The velocity of the left side in m/s.
   * @param vr The velocity of the right side in m/s.
   * @param omega The chassis angular velocity in rad/s.
   * @param al The acceleration of the left side in m/s².
   * @param ar The acceleration of the right side in m/s².
   * @param fl The force of the left side in Newtons.
   * @param fr The force of the right side in Newtons.
   */
  public DifferentialSample(
      double timestamp,
      double x,
      double y,
      double heading,
      double vl,
      double vr,
      double omega,
      double al,
      double ar,
      double fl,
      double fr) {
    this.t = timestamp;
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.vl = vl;
    this.vr = vr;
    this.omega = omega;
    this.al = al;
    this.ar = ar;
    this.fl = fl;
    this.fr = fr;
  }

  @Override
  public double getTimestamp() {
    return t;
  }

  @Override
  public Pose2d getPose() {
    return new Pose2d(x, y, Rotation2d.fromRadians(heading));
  }

  /**
   * Returns the field-relative chassis speeds of this sample.
   *
   * @return the field-relative chassis speeds of this sample.
   * @see edu.wpi.first.math.kinematics.DifferentialDriveKinematics#toChassisSpeeds
   */
  @Override
  public ChassisSpeeds getChassisSpeeds() {
    return new ChassisSpeeds((vl + vr) / 2, 0, omega);
  }

  @Override
  public DifferentialSample interpolate(DifferentialSample endValue, double timestamp) {
    double scale = (timestamp - this.t) / (endValue.t - this.t);

    // Integrate the acceleration to get the rest of the state, since linearly
    // interpolating the state gives an inaccurate result if the accelerations are changing between
    // states
    Matrix<N6, N1> initialState = VecBuilder.fill(x, y, heading, omega, vl, vr);

    double width = (vr - vl) / omega;
    BiFunction<Matrix<N6, N1>, Matrix<N2, N1>, Matrix<N6, N1>> f =
        (state, input) -> {
          //  state =  [x, y, θ, ω, vₗ, vᵣ]
          //  input =  [aₗ, aᵣ]
          //
          //  v = (vₗ + vᵣ)/2
          //  ω = (vᵣ − vₗ)/width
          //  α = (aᵣ − aₗ)/width
          //
          //  ẋ = v cosθ
          //  ẏ = v sinθ
          //  θ̇ = ω
          //  v̇ₗ = aₗ
          //  v̇ᵣ = aᵣ
          //  ω̇ = α
          var heading = state.get(2, 0);
          var vl = state.get(4, 0);
          var vr = state.get(5, 0);
          var ar = state.get(0, 1);
          var al = state.get(0, 0);
          var v = (vl + vr) / 2;
          var ω = (vl - vr) / width;
          var α = (ar - al) / width;
          return VecBuilder.fill(v * Math.cos(heading), v * Math.sin(heading), ω, al, ar, α);
        };

    double τ = timestamp - this.t;
    var sample = NumericalIntegration.rkdp(f, initialState, VecBuilder.fill(al, ar), τ);

    return new DifferentialSample(
        MathUtil.interpolate(this.t, endValue.t, scale),
        sample.get(0, 0),
        sample.get(1, 0),
        sample.get(2, 0),
        sample.get(4, 0),
        sample.get(5, 0),
        sample.get(3, 0),
        sample.get(4, 0) / τ,
        sample.get(5, 0) / τ,
        MathUtil.interpolate(this.fl, endValue.fl, scale),
        MathUtil.interpolate(this.fr, endValue.fr, scale));
  }

  public DifferentialSample flipped() {
    return switch (ChoreoAllianceFlipUtil.getFlipper()) {
      case MIRRORED ->
          new DifferentialSample(
              t,
              ChoreoAllianceFlipUtil.flipX(x),
              ChoreoAllianceFlipUtil.flipY(y), // No-op for mirroring
              ChoreoAllianceFlipUtil.flipHeading(heading),
              vr,
              vl,
              -omega,
              ar,
              al,
              fr,
              fl);
      case ROTATE_AROUND ->
          new DifferentialSample(
              t,
              ChoreoAllianceFlipUtil.flipX(x),
              ChoreoAllianceFlipUtil.flipY(y),
              ChoreoAllianceFlipUtil.flipHeading(heading),
              vl,
              vr,
              omega,
              al,
              ar,
              fl,
              fr);
    };
  }

  public DifferentialSample offsetBy(double timestampOffset) {
    return new DifferentialSample(
        t + timestampOffset, x, y, heading, vl, vr, omega, al, ar, fl, fr);
  }

  /** The struct for the DifferentialSample class. */
  public static final Struct<DifferentialSample> struct = new DifferentialSampleStruct();

  private static final class DifferentialSampleStruct implements Struct<DifferentialSample> {
    @Override
    public Class<DifferentialSample> getTypeClass() {
      return DifferentialSample.class;
    }

    @Override
    public String getTypeName() {
      return "DifferentialSample";
    }

    @Override
    public int getSize() {
      return Struct.kSizeDouble * 10;
    }

    @Override
    public String getSchema() {
      return "double timestamp;"
          + "Pose2d pose;"
          + "double vl;"
          + "double vr;"
          + "double omega;"
          + "double al;"
          + "double ar;"
          + "double fl;"
          + "double fr;";
    }

    @Override
    public Struct<?>[] getNested() {
      return new Struct<?>[] {Pose2d.struct};
    }

    @Override
    public DifferentialSample unpack(ByteBuffer bb) {
      return new DifferentialSample(
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
          bb.getDouble());
    }

    @Override
    public void pack(ByteBuffer bb, DifferentialSample value) {
      bb.putDouble(value.t);
      bb.putDouble(value.x);
      bb.putDouble(value.y);
      bb.putDouble(value.heading);
      bb.putDouble(value.vl);
      bb.putDouble(value.vr);
      bb.putDouble(value.omega);
      bb.putDouble(value.al);
      bb.putDouble(value.ar);
      bb.putDouble(value.fl);
      bb.putDouble(value.fr);
    }
  }

  @Override
  public boolean equals(Object obj) {
    if (!(obj instanceof DifferentialSample)) {
      return false;
    }

    var other = (DifferentialSample) obj;
    return this.t == other.t
        && this.x == other.x
        && this.y == other.y
        && this.heading == other.heading
        && this.vl == other.vl
        && this.vr == other.vr
        && this.omega == other.omega
        && this.al == other.al
        && this.ar == other.ar
        && this.fl == other.fl
        && this.fr == other.fr;
  }
}
