package com.choreo.lib;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.interpolation.Interpolatable;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import lombok.Builder;

@Builder
public class ChoreoTrajectoryState implements Interpolatable<ChoreoTrajectoryState> {
  private static final double FIELD_WIDTH_METERS = 16.55445;

  public final double timestamp;
  public final double x;
  public final double y;
  public final double heading;

  public final double velocityX;
  public final double velocityY;
  public final double angularVelocity;

  /**
   * @return the pose at this state.
   */
  public Pose2d getPose() {
    return new Pose2d(x, y, Rotation2d.fromRadians(heading));
  }

  public ChassisSpeeds getChassisSpeeds() {
    return new ChassisSpeeds(velocityX, velocityY, angularVelocity);
  }

  @Override
  public ChoreoTrajectoryState interpolate(ChoreoTrajectoryState endValue, double t) {
    double scale = (this.timestamp - t) / (endValue.timestamp - t);
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

  public double[] asArray() {
    return new double[] {
      timestamp, x, y, heading, velocityX, velocityY, angularVelocity,
    };
  }

  public ChoreoTrajectoryState flipped() {
    return ChoreoTrajectoryState.builder()
        .x(FIELD_WIDTH_METERS - this.x)
        .y(this.y)
        .heading(Math.PI - this.heading)
        .velocityX(this.velocityX * -1)
        .velocityY(this.velocityY)
        .angularVelocity(this.angularVelocity * -1)
        .build();
  }
}
