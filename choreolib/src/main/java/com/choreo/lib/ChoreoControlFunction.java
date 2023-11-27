package com.choreo.lib;

import java.util.function.BiFunction;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;

/**
 * This interface mostly exists as a type alias.
 */
public interface ChoreoControlFunction extends BiFunction<Pose2d, ChoreoTrajectoryState, ChassisSpeeds> {}
