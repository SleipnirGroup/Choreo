// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <cassert>
#include <cstddef>
#include <functional>
#include <span>
#include <utility>
#include <vector>

#include "trajopt/constraint/angular_velocity_max_magnitude_constraint.hpp"
#include "trajopt/constraint/lane_constraint.hpp"
#include "trajopt/constraint/linear_acceleration_max_magnitude_constraint.hpp"
#include "trajopt/constraint/linear_velocity_direction_constraint.hpp"
#include "trajopt/constraint/linear_velocity_max_magnitude_constraint.hpp"
#include "trajopt/constraint/point_at_constraint.hpp"
#include "trajopt/constraint/point_point_max_constraint.hpp"
#include "trajopt/constraint/point_point_min_constraint.hpp"
#include "trajopt/constraint/line_point_constraint.hpp"
#include "trajopt/constraint/point_line_region_constraint.hpp"
#include "trajopt/constraint/constraint.hpp"
#include "trajopt/constraint/pose_equality_constraint.hpp"
#include "trajopt/constraint/translation_equality_constraint.hpp"
#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/path/path.hpp"
#include "trajopt/util/generate_linear_initial_guess.hpp"
#include "trajopt/util/generate_spline_initial_guess.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Path builder.
///
/// @tparam Drivetrain The drivetrain type (e.g., swerve, differential).
/// @tparam Solution The solution type (e.g., swerve, differential).
template <typename Drivetrain, typename Solution>
class TRAJOPT_DLLEXPORT PathBuilder {
 public:
  /// Sets the Drivetrain object.
  ///
  /// @param drivetrain The drivetrain.
  void set_drivetrain(Drivetrain drivetrain) {
    path.drivetrain = std::move(drivetrain);
  }

  /// Adds a rectangular bumper to a list used when applying keep-out
  /// constraints.
  ///
  /// @param front Distance in meters from center to front bumper edge.
  /// @param left Distance in meters from center to left bumper edge.
  /// @param right Distance in meters from center to right bumper edge.
  /// @param back Distance in meters from center to back bumper edge.
  void set_bumpers(double front, double left, double right, double back) {
    bumpers.emplace_back(KeepOutRegion{.safety_distance = 0.01,
                                       .points = {{+front, +left},
                                                  {-back, +left},
                                                  {-back, -right},
                                                  {+front, -right}}});
  }

  /// Sets the number of discrete samples for each trajectory segment.
  ///
  /// @param counts The sequence of control interval counts per segment. Length
  ///     is number of waypoints - 1.
  void set_control_interval_counts(std::vector<size_t>&& counts) {
    control_interval_counts = std::move(counts);
  }

  /// Gets the control interval counts.
  ///
  /// @return Control interval counts.
  const std::vector<size_t>& get_control_interval_counts() const {
    return control_interval_counts;
  }

  /// Adds a sequence of initial guess points between two waypoints.
  ///
  /// The points are inserted between the waypoints at fromIndex and
  /// fromIndex + 1. Linear interpolation between the waypoint initial guess
  /// points and these segment initial guess points is used as the initial guess
  /// of the robot's pose over the trajectory.
  ///
  /// @param from_index The index of the waypoint the initial guess point comes
  ///     after.
  /// @param guess_points The sequence of initial guess points.
  void sgmt_initial_guess_points(size_t from_index,
                                 std::span<const Pose2d> guess_points) {
    new_wpts(from_index + 1);
    std::vector<Pose2d>& to_initial_guess_points =
        initial_guess_points.at(from_index + 1);
    to_initial_guess_points.insert(to_initial_guess_points.begin(),
                                   guess_points.begin(), guess_points.end());
  }

  /// Applies a pose constraint to a waypoint, and adds an initial guess with
  /// the same pose.
  ///
  /// @param index The waypoint's index.
  /// @param x The x.
  /// @param y The y.
  /// @param heading The heading.
  void pose_wpt(size_t index, double x, double y, double heading) {
    wpt_constraint(index, PoseEqualityConstraint{x, y, heading});
    empty_wpt(index, {x, y, {heading}});
  }

  /// Applies a translation constraint to a waypoint, and adds an initial guess
  /// point with the same translation.
  ///
  /// @param index The waypoint's index.
  /// @param x The x.
  /// @param y The y.
  /// @param heading_guess The heading initial guess.
  void translation_wpt(size_t index, double x, double y,
                       double heading_guess = 0.0) {
    wpt_constraint(index, TranslationEqualityConstraint{x, y});
    empty_wpt(index, {x, y, {heading_guess}});
  }

  /// Sets a waypoint's pose initial guess.
  ///
  /// @param index The waypoint's index.
  /// @param pose_guess The pose initial guess.
  void empty_wpt(size_t index, const Pose2d& pose_guess) {
    new_wpts(index);
    initial_guess_points.at(index).back() = pose_guess;
  }

  /// Applies a linear velocity direction constraint to a waypoint.
  ///
  /// @param index The waypoint's index.
  /// @param angle The angle in radians.
  void wpt_linear_velocity_direction(size_t index, double angle) {
    wpt_constraint(index, LinearVelocityDirectionConstraint{angle});
  }

  /// Applies a linear velocity max magnitude constraint to a waypoint.
  ///
  /// @param index The waypoint's index.
  /// @param magnitude The magnitude.
  void wpt_linear_velocity_max_magnitude(size_t index, double magnitude) {
    wpt_constraint(index, LinearVelocityMaxMagnitudeConstraint{magnitude});
  }

  /// Applies an angular velocity max magnitude constraint to a waypoint.
  ///
  /// @param index The waypoint's index.
  /// @param magnitude The magnitude.
  void wpt_angular_velocity_max_magnitude(size_t index, double magnitude) {
    wpt_constraint(index, AngularVelocityMaxMagnitudeConstraint{magnitude});
  }

  /// Applies a linear acceleration max magnitude constraint to a waypoint.
  ///
  /// @param index The waypoint's index.
  /// @param magnitude The magnitude.
  void wpt_linear_acceleration_max_magnitude(size_t index, double magnitude) {
    wpt_constraint(index, LinearAccelerationMaxMagnitudeConstraint{magnitude});
  }

  /// Applies a point-at constraint to a waypoint.
  ///
  /// @param index The waypoint's index.
  /// @param field_point The field point to point at.
  /// @param heading_tolerance The heading tolerance.
  /// @param point_away Whether to point away from the field point.
  void wpt_point_at(size_t index, const Translation2d& field_point,
                    double heading_tolerance, bool point_away) {
    wpt_constraint(
        index, PointAtConstraint{field_point, heading_tolerance, point_away});
  }

  /// Applies a keep-in circle constraint to a waypoint.
  ///
  /// Applies to the robot bumpers.
  ///
  /// @param index The waypoint's index.
  /// @param center The circle's center.
  /// @param radius The circle's radius.
  void wpt_keep_in_circle(size_t index, const Translation2d& center,
                          double radius) {
    for (const auto& bumper : bumpers) {
      for (const auto& point : bumper.points) {
        wpt_constraint(index, PointPointMaxConstraint{point, center, radius});
      }
    }
    wpt_constraint(index, PointPointMaxConstraint{{0.0, 0.0}, center, radius});
  }

  /// Applies a keep-in polygon constraint to a waypoint.
  ///
  /// Applies to the robot bumpers.
  ///
  /// @param index The waypoint's index.
  /// @param field_points The points defining the keep-in polygon (must wind
  ///     counterclockwise).
  void wpt_keep_in_polygon(size_t index,
                           std::span<Translation2d> field_points) {
    for (size_t i = 0; i < field_points.size(); ++i) {
      size_t j = (i + 1) % field_points.size();
      wpt_constraint(
          index,
          PointLineRegionConstraint{
              {0.0, 0.0}, field_points[i], field_points[j], Side::ABOVE});
      for (const auto& bumper : bumpers) {
        for (const auto& corner : bumper.points) {
          wpt_constraint(
              index, PointLineRegionConstraint{corner, field_points[i],
                                               field_points[j], Side::ABOVE});
        }
      }
    }
  }

  /// Applies a keep-in lane constraint to a waypoint.
  ///
  /// Applies to the robot center.
  ///
  /// @param index The waypoint's index.
  /// @param center_line_start The center line's start point.
  /// @param center_line_end The center line's end point.
  /// @param tolerance The distance from the center line to each lane edge.
  void wpt_keep_in_lane(size_t index, const Translation2d& center_line_start,
                        const Translation2d& center_line_end,
                        double tolerance) {
    wpt_constraint(
        index, LaneConstraint{center_line_start, center_line_end, tolerance});
  }

  /// Applies a keep-out circle constraint to a waypoint.
  ///
  /// Applies to the robot bumpers.
  ///
  /// @param index The waypoint's index.
  /// @param center The circle's center.
  /// @param radius The circle's radius.
  void wpt_keep_out_circle(size_t index, const Translation2d& center,
                           double radius) {
    for (const auto& bumper : bumpers) {
      for (size_t i = 0; i < bumper.points.size(); ++i) {
        size_t j = (i + 1) % bumper.points.size();
        wpt_constraint(index, PointPointMinConstraint{bumper.points.at(i),
                                                      center, radius});
        wpt_constraint(
            index, LinePointConstraint{bumper.points.at(i), bumper.points.at(j),
                                       center, radius});
      }
    }
  }

  /// Applies a linear velocity direction constraint between two waypoints.
  ///
  /// @param from_index The first waypoint's index.
  /// @param to_index The second waypoint's index.
  /// @param angle The angle in radians.
  void sgmt_linear_velocity_direction(size_t from_index, size_t to_index,
                                      double angle) {
    sgmt_constraint(from_index, to_index,
                    LinearVelocityDirectionConstraint{angle});
  }

  /// Applies a linear velocity max magnitude constraint between two waypoints.
  ///
  /// @param from_index The first waypoint's index.
  /// @param to_index The second waypoint's index.
  /// @param magnitude The magnitude.
  void sgmt_linear_velocity_max_magnitude(size_t from_index, size_t to_index,
                                          double magnitude) {
    sgmt_constraint(from_index, to_index,
                    LinearVelocityMaxMagnitudeConstraint{magnitude});
  }

  /// Applies an angular velocity max magnitude constraint between two
  /// waypoints.
  ///
  /// @param from_index The first waypoint's index.
  /// @param to_index The second waypoint's index.
  /// @param magnitude The magnitude.
  void sgmt_angular_velocity_max_magnitude(size_t from_index, size_t to_index,
                                           double magnitude) {
    sgmt_constraint(from_index, to_index,
                    AngularVelocityMaxMagnitudeConstraint{magnitude});
  }

  /// Applies a linear acceleration max magnitude constraint between two
  /// waypoints.
  ///
  /// @param from_index The first waypoint's index.
  /// @param to_index The second waypoint's index.
  /// @param magnitude The magnitude.
  void sgmt_linear_acceleration_max_magnitude(size_t from_index,
                                              size_t to_index,
                                              double magnitude) {
    sgmt_constraint(from_index, to_index,
                    LinearAccelerationMaxMagnitudeConstraint{magnitude});
  }

  /// Applies a point-at constraint between two waypoints.
  ///
  /// @param from_index The first waypoint's index.
  /// @param to_index The second waypoint's index.
  /// @param field_point The field point to point at.
  /// @param heading_tolerance The heading tolerance.
  /// @param point_away Whether to face away from the field point.
  void sgmt_point_at(size_t from_index, size_t to_index,
                     Translation2d field_point, double heading_tolerance,
                     bool point_away) {
    sgmt_constraint(
        from_index, to_index,
        PointAtConstraint{field_point, heading_tolerance, point_away});
  }

  /// Applies a keep-in circle constraint between two waypoints.
  ///
  /// Applies to the robot bumpers.
  ///
  /// @param from_index The first waypoint's index.
  /// @param to_index The second waypoint's index.
  /// @param center The circle's center.
  /// @param radius The circle's radius.
  void sgmt_keep_in_circle(size_t from_index, size_t to_index,
                           const Translation2d& center, double radius) {
    for (const auto& bumper : bumpers) {
      for (size_t i = 0; i < bumper.points.size(); ++i) {
        sgmt_constraint(
            from_index, to_index,
            PointPointMaxConstraint{bumper.points.at(i), center, radius});
      }
    }
  }

  /// Applies a keep-in polygon constraint between two waypoints.
  ///
  /// Applies to the robot bumpers.
  ///
  /// @param from_index The first waypoint's index.
  /// @param to_index The second waypoint's index.
  /// @param field_points The points defining the keep-in polygon (must wind
  ///     counterclockwise).
  void sgmt_keep_in_polygon(size_t from_index, size_t to_index,
                            std::span<Translation2d> field_points) {
    for (size_t i = 0; i < field_points.size(); ++i) {
      size_t j = (i + 1) % field_points.size();
      sgmt_constraint(
          from_index, to_index,
          PointLineRegionConstraint{
              {0.0, 0.0}, field_points[i], field_points[j], Side::ABOVE});
      for (const auto& bumper : bumpers) {
        for (const auto& corner : bumper.points) {
          sgmt_constraint(
              from_index, to_index,
              PointLineRegionConstraint{corner, field_points[i],
                                        field_points[j], Side::ABOVE});
        }
      }
    }
  }

  /// Applies a keep-in lane constraint between two waypoints.
  ///
  /// Applies to the robot center.
  ///
  /// @param from_index The first waypoint's index.
  /// @param to_index The second waypoint's index.
  /// @param center_line_start The center line's start point.
  /// @param center_line_end The center line's end point.
  /// @param tolerance The distance from the center line to each lane edge.
  void sgmt_keep_in_lane(size_t from_index, size_t to_index,
                         const Translation2d& center_line_start,
                         const Translation2d& center_line_end,
                         double tolerance) {
    sgmt_constraint(
        from_index, to_index,
        LaneConstraint{center_line_start, center_line_end, tolerance});
  }

  /// Applies a keep-out circle constraint between two waypoints.
  ///
  /// Applies to the robot bumpers.
  ///
  /// @param from_index The first waypoint's index.
  /// @param to_index The second waypoint's index.
  /// @param center The circle's center.
  /// @param radius The circle's radius.
  void sgmt_keep_out_circle(size_t from_index, size_t to_index,
                            Translation2d center, double radius) {
    for (const auto& bumper : bumpers) {
      for (size_t i = 0; i < bumper.points.size(); ++i) {
        size_t j = (i + 1) % bumper.points.size();
        sgmt_constraint(
            from_index, to_index,
            PointPointMinConstraint{bumper.points.at(i), center, radius});
        sgmt_constraint(
            from_index, to_index,
            LinePointConstraint{bumper.points.at(i), bumper.points.at(j),
                                center, radius});
      }
    }
  }

  /// Adds a callback to retrieve the state of the solver as a Solution.
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

  /// Gets the DifferentialPath being constructed.
  ///
  /// @return The path.
  Path<Drivetrain, Solution>& get_path() { return path; }

  /// Calculates a discrete, linear initial guess of the x, y, and heading of
  /// the robot that goes through each segment.
  ///
  /// @return The initial guess, as a solution.
  Solution calculate_linear_initial_guess() const {
    return generate_linear_initial_guess<Solution>(initial_guess_points,
                                                   control_interval_counts);
  }

  /// Calculates a discrete, spline initial guess of the x, y, and heading of
  /// the robot that goes through each segment.
  ///
  /// @return The initial guess, as a solution.
  Solution calculate_spline_initial_guess() const {
    return generate_spline_initial_guess<Solution>(initial_guess_points,
                                                   control_interval_counts);
  }

 private:
  /// Represents a physical keep-out region that the robot must avoid by a
  /// certain distance. Arbitrary polygons can be expressed with this class, and
  /// keep-out circles can also be created by only using one point with a safety
  /// distance.
  ///
  /// Keep-out points must be wound either clockwise or counterclockwise.
  struct TRAJOPT_DLLEXPORT KeepOutRegion {
    /// Minimum distance from the keep-out region the robot must maintain.
    double safety_distance;

    /// The list of points that make up this keep-out region.
    std::vector<Translation2d> points;
  };

  /// The path.
  Path<Drivetrain, Solution> path;

  /// The list of bumpers.
  std::vector<KeepOutRegion> bumpers;

  /// The initial guess points.
  std::vector<std::vector<Pose2d>> initial_guess_points;

  /// The control interval counts.
  std::vector<size_t> control_interval_counts;

  /// Applies a constraint at a waypoint.
  ///
  /// @param index The waypoint's index.
  /// @param constraint The constraint.
  void wpt_constraint(size_t index, const Constraint& constraint) {
    new_wpts(index);
    path.waypoints.at(index).waypoint_constraints.push_back(constraint);
  }

  /// Applies a constraint to the continuum of states between two waypoints.
  ///
  /// @param from_index The first waypoint's index.
  /// @param to_index The second waypoint's index.
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

  /// Adds new waypoints up to and including the given index.
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
