// Copyright (c) TrajoptLib contributors

#pragma once

#include <cassert>
#include <utility>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/constraint/detail/line_point_squared_distance.hpp"
#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Point-line constraint.
///
/// Specifies the required minimum distance between a point on the robot's frame
/// and a line segment on the field.
class TRAJOPT_DLLEXPORT PointLineConstraint {
 public:
  /// Constructs a PointLineConstraint.
  ///
  /// @param robot_point Robot point.
  /// @param field_line_start Field line start.
  /// @param field_line_end Field line end.
  /// @param min_distance Minimum distance between robot point and field line.
  ///     Must be nonnegative.
  explicit PointLineConstraint(Translation2d robot_point,
                               Translation2d field_line_start,
                               Translation2d field_line_end,
                               double min_distance)
      : m_robot_point{std::move(robot_point)},
        m_field_line_start{std::move(field_line_start)},
        m_field_line_end{std::move(field_line_end)},
        m_min_distance{min_distance} {
    assert(min_distance >= 0.0);
  }

  /// Applies this constraint to the given problem.
  ///
  /// @param problem The optimization problem.
  /// @param pose The robot's pose.
  /// @param linear_velocity The robot's linear velocity.
  /// @param angular_velocity The robot's angular velocity.
  /// @param linear_acceleration The robot's linear acceleration.
  /// @param angular_acceleration The robot's angular acceleration.
  void apply(
      slp::Problem<double>& problem, const Pose2v<double>& pose,
      [[maybe_unused]] const Translation2v<double>& linear_velocity,
      [[maybe_unused]] const slp::Variable<double>& angular_velocity,
      [[maybe_unused]] const Translation2v<double>& linear_acceleration,
      [[maybe_unused]] const slp::Variable<double>& angular_acceleration) {
    auto point = pose.translation() + m_robot_point.rotate_by(pose.rotation());
    auto squared_distance = detail::line_point_squared_distance(
        m_field_line_start, m_field_line_end, point);
    problem.subject_to(squared_distance >= m_min_distance * m_min_distance);
  }

 private:
  Translation2d m_robot_point;
  Translation2d m_field_line_start;
  Translation2d m_field_line_end;
  double m_min_distance;
};

}  // namespace trajopt
