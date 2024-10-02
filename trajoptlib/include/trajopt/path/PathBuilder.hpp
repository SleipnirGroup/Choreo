// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <functional>
#include <utility>
#include <vector>

#include "trajopt/constraint/Constraint.hpp"
#include "trajopt/obstacle/Bumpers.hpp"
#include "trajopt/obstacle/Obstacle.hpp"
#include "trajopt/path/Path.hpp"
#include "trajopt/util/GenerateLinearInitialGuess.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * Path builder.
 *
 * @tparam Drivetrain The drivetrain type (e.g., swerve, differential).
 * @tparam Solution The solution type (e.g., swerve, differential).
 */
template <typename Drivetrain, typename Solution>
class TRAJOPT_DLLEXPORT PathBuilder {
 public:
  /**
   * Set the Drivetrain object
   *
   * @param drivetrain the new drivetrain
   */
  void SetDrivetrain(Drivetrain drivetrain) {
    path.drivetrain = std::move(drivetrain);
  }

  /**
   * Get the DifferentialPath being constructed
   *
   * @return the path
   */
  Path<Drivetrain, Solution>& GetPath() { return path; }

  /**
   * Get all bumpers currently added to the path builder
   *
   * @return a list of bumpers applied to the builder.
   */
  std::vector<Bumpers>& GetBumpers() { return bumpers; }

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
  void PoseWpt(size_t index, double x, double y, double heading) {
    WptConstraint(index, PoseEqualityConstraint{x, y, heading});
    WptInitialGuessPoint(index, {x, y, {heading}});
  }

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
                      double headingGuess = 0.0) {
    WptConstraint(index, TranslationEqualityConstraint{x, y});
    WptInitialGuessPoint(index, {x, y, {headingGuess}});
  }

  /**
   * Provide a guess of the instantaneous pose of the robot at a waypoint.
   *
   * @param wptIndex the waypoint to apply the guess to
   * @param poseGuess the guess of the robot's pose
   */
  void WptInitialGuessPoint(size_t wptIndex, const Pose2d& poseGuess) {
    NewWpts(wptIndex);
    initialGuessPoints.at(wptIndex).back() = poseGuess;
  }

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
                              const std::vector<Pose2d>& sgmtPoseGuess) {
    NewWpts(fromIndex + 1);
    std::vector<Pose2d>& toInitialGuessPoints =
        initialGuessPoints.at(fromIndex + 1);
    toInitialGuessPoints.insert(toInitialGuessPoints.begin(),
                                sgmtPoseGuess.begin(), sgmtPoseGuess.end());
  }

  /**
   * Add polygon or circle shaped bumpers to a list used when applying
   * obstacle constraints.
   *
   * @param newBumpers bumpers to add
   */
  void AddBumpers(Bumpers&& newBumpers) {
    bumpers.emplace_back(std::move(newBumpers));
  }

  /**
   * Add a rectangular bumper to a list used when applying
   * obstacle constraints.
   *
   * @param front Distance in meters from center to front bumper edge
   * @param left Distance in meters from center to left bumper edge
   * @param right Distance in meters from center to right bumper edge
   * @param back Distance in meters from center to back bumper edge
   */
  void SetBumpers(double front, double left, double right, double back) {
    bumpers.emplace_back(trajopt::Bumpers{.safetyDistance = 0.01,
                                          .points = {{+front, +left},
                                                     {-back, +left},
                                                     {-back, -right},
                                                     {+front, -right}}});
  }

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
   * Apply a custom constraint to the continuum of state between two waypoints.
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
  void ControlIntervalCounts(std::vector<size_t>&& counts) {
    controlIntervalCounts = std::move(counts);
  }

  /**
   * Get the Control Interval Counts object
   *
   * @return const std::vector<size_t>&
   */
  const std::vector<size_t>& GetControlIntervalCounts() const {
    return controlIntervalCounts;
  }

  /**
   * Calculate a discrete, linear initial guess of the x, y, and heading
   * of the robot that goes through each segment.
   *
   * @return the initial guess, as a solution
   */
  Solution CalculateInitialGuess() const {
    return GenerateLinearInitialGuess<Solution>(initialGuessPoints,
                                                controlIntervalCounts);
  }

  /**
   * Add a callback to retrieve the state of the solver as a Solution.
   *
   * This callback will run on every iteration of the solver.
   *
   * @param callback A callback whose first parameter is the Solution based on
   *     the solver's state at that iteration, and second parameter is the
   *     handle passed into Generate().
   *
   */
  void AddIntermediateCallback(
      const std::function<void(Solution& solution, int64_t handle)> callback) {
    path.callbacks.push_back(callback);
  }

 protected:
  /// The path.
  Path<Drivetrain, Solution> path;

  /// The list of bumpers.
  std::vector<Bumpers> bumpers;

  /// The initial guess points.
  std::vector<std::vector<Pose2d>> initialGuessPoints;

  /// The control interval counts.
  std::vector<size_t> controlIntervalCounts;

  /**
   * Add new waypoints up to and including the given index.
   *
   * @param finalIndex The final index.
   */
  void NewWpts(size_t finalIndex) {
    if (finalIndex < path.waypoints.size()) {
      return;
    }

    for (size_t i = path.waypoints.size(); i <= finalIndex; ++i) {
      path.waypoints.emplace_back();
      initialGuessPoints.emplace_back(std::vector<Pose2d>{{0.0, 0.0, {0.0}}});
      if (i != 0) {
        controlIntervalCounts.push_back(40);
      }
    }
  }
};

}  // namespace trajopt
