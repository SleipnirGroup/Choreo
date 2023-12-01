package com.choreo.lib;

import java.util.function.BiFunction;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;

/**
 * This interface exists as a type alias for BiFunction<Pose2d, ChoreoTrajectoryState, ChassisSpeeds>.
 * A ChoreoControlFunction has signature (Pose2d currentPose, ChoreoTrajectoryState referenceState)->ChassisSpeeds,
 * where the function returns robot-relative ChassisSpeeds for the robot. 
 */
public interface ChoreoControlFunction extends BiFunction<Pose2d, ChoreoTrajectoryState, ChassisSpeeds> {}
