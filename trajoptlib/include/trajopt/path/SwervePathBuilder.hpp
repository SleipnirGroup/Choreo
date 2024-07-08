// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <cassert>
#include <cstddef>
#include <functional>
#include <vector>

#include "trajopt/constraint/Constraint.hpp"
#include "trajopt/drivetrain/SwerveDrivetrain.hpp"
#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/obstacle/Bumpers.hpp"
#include "trajopt/obstacle/Obstacle.hpp"
#include "trajopt/path/Path.hpp"
#include "trajopt/solution/SwerveSolution.hpp"

namespace trajopt {

/**
 * Builds a swerve path using information about how the robot
 * must travel through a series of waypoints. This path can be converted
 * to a trajectory using SwerveTrajectoryGenerator.
 */
class TRAJOPT_DLLEXPORT SwervePathBuilder {
 public:
  /**
   * Get the SwervePath being constructed
   *
   * @return the path
   */
  SwervePath& GetPath();

  /**
   * Set the Drivetrain object
   *
   * @param drivetrain the new drivetrain
   */
  void SetDrivetrain(SwerveDrivetrain drivetrain);

  /**
   * Create a pose waypoint constraint on the waypoint at the provided
   * index, and add an initial guess with the same pose This specifies that the
   * position and heading of the robot at the waypoint must be fixed at the
   * values provided.
   *
   * @param index index of the pose waypoint
   * @param x the x
   * @param y the y
   * @param heading the heading
   */
  void PoseWpt(size_t index, double x, double y, double heading);

  /**
   * Create a translation waypoint constraint on the waypoint at the
   * provided index, and add an initial guess point with the same translation.
   * This specifies that the position of the robot at the waypoint must be fixed
   * at the value provided.
   *
   * @param index index of the pose waypoint
   * @param x the x
   * @param y the y
   * @param headingGuess optionally, an initial guess of the heading
   */
  void TranslationWpt(size_t index, double x, double y,
                      double headingGuess = 0.0);

  /**
   * Provide a guess of the instantaneous pose of the robot at a waypoint.
   *
   * @param wptIndex the waypoint to apply the guess to
   * @param poseGuess the guess of the robot's pose
   */
  void WptInitialGuessPoint(size_t wptIndex, const Pose2d& poseGuess);

  /**
   * Add a sequence of initial guess points between two waypoints. The points
   * are inserted between the waypoints at fromIndex and fromIndex + 1. Linear
   * interpolation between the waypoint initial guess points and these segment
   * initial guess points is used as the initial guess of the robot's pose over
   * the trajectory.
   *
   * @param fromIndex index of the waypoint the initial guess point
   *                 comes immediately after
   * @param sgmtPoseGuess the sequence of initial guess points
   */
  void SgmtInitialGuessPoints(size_t fromIndex,
                              const std::vector<Pose2d>& sgmtPoseGuess);

  /**
   * Add polygon or circle shaped bumpers to a list used when applying
   * obstacle constraints.
   *
   * @param newBumpers bumpers to add
   */
  void AddBumpers(Bumpers&& newBumpers);

  /**
   * Apply an obstacle constraint to a waypoint.
   *
   * @param index index of the waypoint
   * @param obstacle the obstacle
   */
  void WptObstacle(size_t index, const Obstacle& obstacle);

  /**
   * Apply an obstacle constraint to the continuum of state between two
   * waypoints.
   *
   * @param fromIndex index of the waypoint at the beginning of the continuum
   * @param toIndex index of the waypoint at the end of the continuum
   * @param obstacle the obstacle
   */
  void SgmtObstacle(size_t fromIndex, size_t toIndex, const Obstacle& obstacle);

  /**
   * Apply a constraint at a waypoint.
   *
   * @param index Index of the waypoint.
   * @param constraint The constraint.
   */
  void WptConstraint(size_t index, const Constraint& constraint) {
    NewWpts(index);
    path.waypoints.at(index).waypointConstraints.push_back(constraint);
  }

  /**
   * Apply a custom holonomic constraint to the continuum of state between two
   * waypoints.
   *
   * @param fromIndex Index of the waypoint at the beginning of the continuum.
   * @param toIndex Index of the waypoint at the end of the continuum.
   * @param constraint The constraint.
   */
  void SgmtConstraint(size_t fromIndex, size_t toIndex,
                      const Constraint& constraint) {
    assert(fromIndex < toIndex);

    NewWpts(toIndex);
    path.waypoints.at(fromIndex).waypointConstraints.push_back(constraint);
    for (size_t index = fromIndex + 1; index <= toIndex; ++index) {
      path.waypoints.at(index).waypointConstraints.push_back(constraint);
      path.waypoints.at(index).segmentConstraints.push_back(constraint);
    }
  }

  /**
   * If using a discrete algorithm, specify the number of discrete
   * samples for every segment of the trajectory
   *
   * @param counts the sequence of control interval counts per segment, length
   * is number of waypoints - 1
   */
  void ControlIntervalCounts(std::vector<size_t>&& counts);

  /**
   * Get the Control Interval Counts object
   *
   * @return const std::vector<size_t>&
   */
  const std::vector<size_t>& GetControlIntervalCounts() const;

  /**
   * Calculate a discrete, linear initial guess of the x, y, and heading
   * of the robot that goes through each segment.
   *
   * @return the initial guess, as a solution
   */
  SwerveSolution CalculateInitialGuess() const;

  /**
   * Add a callback to retrieve the state of the solver as a SwerveSolution.
   * This callback will run on every iteration of the solver.
   * The callback's first parameter is the SwerveSolution based on the solver's
   * state at that iteration. The second parameter is the handle passed into
   * Generate().
   * @param callback the callback
   */
  void AddIntermediateCallback(
      const std::function<void(SwerveSolution&, int64_t)> callback);

 private:
  SwervePath path;

  std::vector<Bumpers> bumpers;

  std::vector<std::vector<Pose2d>> initialGuessPoints;
  std::vector<size_t> controlIntervalCounts;

  void NewWpts(size_t finalIndex);
};

}  // namespace trajopt
