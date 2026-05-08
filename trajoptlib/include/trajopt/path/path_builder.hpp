// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <cassert>
#include <functional>
#include <utility>
#include <vector>

#include "trajopt/constraint/constraint.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/path/path.hpp"
#include "trajopt/util/generate_linear_initial_guess.hpp"
#include "trajopt/util/generate_spline_initial_guess.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Represents a physical keep-out region that the robot must avoid by a certain
/// distance. Arbitrary polygons can be expressed with this class, and keep-out
/// circles can also be created by only using one point with a safety distance.
///
/// Keep-out points must be wound either clockwise or counterclockwise.
struct TRAJOPT_DLLEXPORT KeepOutRegion {
  /// Minimum distance from the keep-out region the robot must maintain.
  double safety_distance;

  /// The list of points that make up this keep-out region.
  std::vector<Translation2d> points;
};

/// Path builder.
///
/// @tparam Drivetrain The drivetrain type (e.g., swerve, differential).
/// @tparam Solution The solution type (e.g., swerve, differential).
template <typename Drivetrain, typename Solution>
class TRAJOPT_DLLEXPORT PathBuilder {
 public:
  /// Set the Drivetrain object
  ///
  /// @param drivetrain the new drivetrain
  void set_drivetrain(Drivetrain drivetrain) {
    path.drivetrain = std::move(drivetrain);
  }

  /// Add a rectangular bumper to a list used when applying
  /// keep-out constraints.
  ///
  /// @param front Distance in meters from center to front bumper edge
  /// @param left Distance in meters from center to left bumper edge
  /// @param right Distance in meters from center to right bumper edge
  /// @param back Distance in meters from center to back bumper edge
  void set_bumpers(double front, double left, double right, double back) {
    bumpers.emplace_back(trajopt::KeepOutRegion{.safety_distance = 0.01,
                                                .points = {{+front, +left},
                                                           {-back, +left},
                                                           {-back, -right},
                                                           {+front, -right}}});
  }

  /// Get all bumpers currently added to the path builder
  ///
  /// @return a list of bumpers applied to the builder.
  std::vector<KeepOutRegion>& get_bumpers() { return bumpers; }

  /// If using a discrete algorithm, specify the number of discrete
  /// samples for every segment of the trajectory
  ///
  /// @param counts the sequence of control interval counts per segment, length
  ///     is number of waypoints - 1
  void set_control_interval_counts(std::vector<size_t>&& counts) {
    control_interval_counts = std::move(counts);
  }

  /// Get the Control Interval Counts object
  ///
  /// @return const std::vector<size_t>&
  const std::vector<size_t>& get_control_interval_counts() const {
    return control_interval_counts;
  }

  /// Provide a guess of the instantaneous pose of the robot at a waypoint.
  ///
  /// @param wpt_index the waypoint to apply the guess to
  /// @param pose_guess the guess of the robot's pose
  void wpt_initial_guess_point(size_t wpt_index, const Pose2d& pose_guess) {
    new_wpts(wpt_index);
    initial_guess_points.at(wpt_index).back() = pose_guess;
  }

  /// Add a sequence of initial guess points between two waypoints. The points
  /// are inserted between the waypoints at fromIndex and fromIndex + 1. Linear
  /// interpolation between the waypoint initial guess points and these segment
  /// initial guess points is used as the initial guess of the robot's pose over
  /// the trajectory.
  ///
  /// @param from_index index of the waypoint the initial guess point comes
  ///     immediately after
  /// @param sgmt_pose_guess the sequence of initial guess points
  void sgmt_initial_guess_points(size_t from_index,
                                 const std::vector<Pose2d>& sgmt_pose_guess) {
    new_wpts(from_index + 1);
    std::vector<Pose2d>& to_initial_guess_points =
        initial_guess_points.at(from_index + 1);
    to_initial_guess_points.insert(to_initial_guess_points.begin(),
                                   sgmt_pose_guess.begin(),
                                   sgmt_pose_guess.end());
  }

  /// Create a pose waypoint constraint on the waypoint at the provided
  /// index, and add an initial guess with the same pose This specifies that the
  /// position and heading of the robot at the waypoint must be fixed at the
  /// values provided.
  ///
  /// @param index index of the pose waypoint
  /// @param x the x
  /// @param y the y
  /// @param heading the heading
  void pose_wpt(size_t index, double x, double y, double heading) {
    wpt_constraint(index, PoseEqualityConstraint{x, y, heading});
    wpt_initial_guess_point(index, {x, y, {heading}});
  }

  /// Create a translation waypoint constraint on the waypoint at the
  /// provided index, and add an initial guess point with the same translation.
  /// This specifies that the position of the robot at the waypoint must be
  /// fixed at the value provided.
  ///
  /// @param index index of the pose waypoint
  /// @param x the x
  /// @param y the y
  /// @param heading_guess optionally, an initial guess of the heading
  void translation_wpt(size_t index, double x, double y,
                       double heading_guess = 0.0) {
    wpt_constraint(index, TranslationEqualityConstraint{x, y});
    wpt_initial_guess_point(index, {x, y, {heading_guess}});
  }

  /// Apply a constraint at a waypoint.
  ///
  /// @param index Index of the waypoint.
  /// @param constraint The constraint.
  void wpt_constraint(size_t index, const Constraint& constraint) {
    new_wpts(index);
    path.waypoints.at(index).waypoint_constraints.push_back(constraint);
  }

  /// Apply a custom constraint to the continuum of state between two waypoints.
  ///
  /// @param from_index Index of the waypoint at the beginning of the continuum.
  /// @param to_index Index of the waypoint at the end of the continuum.
  /// @param constraint The constraint.
  void sgmt_constraint(size_t from_index, size_t to_index,
                       const Constraint& constraint) {
    assert(from_index < to_index);

    new_wpts(to_index);
    path.waypoints.at(from_index).waypoint_constraints.push_back(constraint);
    for (size_t index = from_index + 1; index <= to_index; ++index) {
      path.waypoints.at(index).waypoint_constraints.push_back(constraint);
      path.waypoints.at(index).segment_constraints.push_back(constraint);
    }
  }

  /// Add a callback to retrieve the state of the solver as a Solution.
  ///
  /// This callback will run on every iteration of the solver.
  ///
  /// @param callback A callback whose first parameter is the Solution based on
  ///     the solver's state at that iteration, and second parameter is the
  ///     handle passed into Generate().
  void add_callback(
      const std::function<void(const Solution& solution, int64_t handle)>
          callback) {
    path.callbacks.push_back(callback);
  }

  /// Get the DifferentialPath being constructed
  ///
  /// @return the path
  Path<Drivetrain, Solution>& get_path() { return path; }

  /// Calculate a discrete, linear initial guess of the x, y, and heading of the
  /// robot that goes through each segment.
  ///
  /// @return the initial guess, as a solution
  Solution calculate_linear_initial_guess() const {
    return generate_linear_initial_guess<Solution>(initial_guess_points,
                                                   control_interval_counts);
  }

  /// Calculate a discrete, spline initial guess of the x, y, and heading of the
  /// robot that goes through each segment.
  ///
  /// @return the initial guess, as a solution
  Solution calculate_spline_initial_guess() const {
    return generate_spline_initial_guess<Solution>(initial_guess_points,
                                                   control_interval_counts);
  }

 protected:
  /// The path.
  Path<Drivetrain, Solution> path;

  /// The list of bumpers.
  std::vector<KeepOutRegion> bumpers;

  /// The initial guess points.
  std::vector<std::vector<Pose2d>> initial_guess_points;

  /// The control interval counts.
  std::vector<size_t> control_interval_counts;

  /// Add new waypoints up to and including the given index.
  ///
  /// @param final_index The final index.
  void new_wpts(size_t final_index) {
    if (final_index < path.waypoints.size()) {
      return;
    }

    for (size_t i = path.waypoints.size(); i <= final_index; ++i) {
      path.waypoints.emplace_back();
      initial_guess_points.emplace_back(std::vector<Pose2d>{{0.0, 0.0, {0.0}}});
      if (i != 0) {
        control_interval_counts.push_back(40);
      }
    }
  }
};

}  // namespace trajopt
