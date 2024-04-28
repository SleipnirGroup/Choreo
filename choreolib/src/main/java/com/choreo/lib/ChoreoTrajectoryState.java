// Copyright (c) Choreo contributors

package com.choreo.lib;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

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
   * @param t the timestamp of the interpolated state. It should be between this state and endValue.
   * @return the interpolated state.
   */
  @Override
  public ChoreoTrajectoryState interpolate(ChoreoTrajectoryState endValue, double t) {
    double scale = (t - this.timestamp) / (endValue.timestamp - this.timestamp);
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

  /**
   * Returns the nearest ChoreoTrajectoryState, by position, from a list of ChoreoTrajectoryStates. If two or more ChoreoTrajectoryStates in the list have the same
   * distance from this ChoreoTrajectoryState, return the one with the closest rotation component.
   *
   * @param trajectoryStates The list of trajectoryStates to find the nearest.
   * @return The nearest ChoreoTrajectoryState from the list.
   */
  public ChoreoTrajectoryState nearest(List<ChoreoTrajectoryState> trajectoryStates) {
    // Use only the position to get the closest ChoreoTrajectoryState in the list
    return nearest(trajectoryStates, 1.0, 0.0, 0.0, 0.0, 0.0);
  }


  /**
   * Returns the nearest ChoreoTrajectoryState from a list of ChoreoTrajectoryStates.
   * Different parameters of the ChoreoTrajectoryState, like position and speed, are compared with weighted values.
   * If two or more ChoreoTrajectoryStates in the list have the same distance 
   * from this ChoreoTrajectoryState, return the one with the closest rotation component.
   *
   * @param trajectoryStates       The list of trajectoryStates to find the nearest.
   * @param poseWeight             Determines how much the position error affects the output.
   * @param headingWeight          Determines how much the heading error affects the output.
   * @param velocityXWeight        Determines how much the velocity in the X direction affects the output.
   * @param velocityYWeight        Determines how much the velocity in the Y direction affects the output.
   * @param angularVelocityWeight Determines how much the angular velocity affects the output.
   * @return The nearest ChoreoTrajectoryState from the list.
   */
  public ChoreoTrajectoryState nearest(List<ChoreoTrajectoryState> trajectoryStates, double poseWeight, double headingWeight, double velocityXWeight, double velocityYWeight, double angularVelocityWeight) {
    return Collections.min(
        trajectoryStates,
        Comparator.comparing(
                (ChoreoTrajectoryState other) -> (this.getPose().getTranslation().getDistance(other.getPose().getTranslation()) * poseWeight) + 
                  (Math.abs(this.getPose().getRotation().minus(other.getPose().getRotation()).getRadians()) * headingWeight) +
                  (Math.abs(this.getChassisSpeeds().minus(other.getChassisSpeeds()).vxMetersPerSecond) * velocityXWeight) +
                  (Math.abs(this.getChassisSpeeds().minus(other.getChassisSpeeds()).vyMetersPerSecond) * velocityYWeight) +
                  (Math.abs(this.getChassisSpeeds().minus(other.getChassisSpeeds()).omegaRadiansPerSecond) * angularVelocityWeight))
            .thenComparing(
              (ChoreoTrajectoryState other) ->
                  Math.abs(this.getPose().getRotation().minus(other.getPose().getRotation()).getRadians())));
  }
}
