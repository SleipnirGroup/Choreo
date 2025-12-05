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

/// Line-point constraint.
///
/// Specifies the required minimum distance between a line segment on the
/// robot's frame and a point on the field.
class TRAJOPT_DLLEXPORT LinePointConstraint {
 public:
  /// Constructs a LinePointConstraint.
  ///
  /// @param robot_line_start Robot line start.
  /// @param robot_line_end Robot line end.
  /// @param field_point Field point.
  /// @param min_distance Minimum distance between robot line and field point.
  ///     Must be nonnegative.
  explicit LinePointConstraint(Translation2d robot_line_start,
                               Translation2d robot_line_end,
                               Translation2d field_point, double min_distance)
      : m_robot_line_start{std::move(robot_line_start)},
        m_robot_line_end{std::move(robot_line_end)},
        m_field_point{std::move(field_point)},
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
    auto line_start =
        pose.translation() + m_robot_line_start.rotate_by(pose.rotation());
    auto line_end =
        pose.translation() + m_robot_line_end.rotate_by(pose.rotation());
    auto squared_distance = detail::line_point_squared_distance(
        line_start, line_end, m_field_point);
    problem.subject_to(squared_distance >= m_min_distance * m_min_distance);
  }

 private:
  Translation2d m_robot_line_start;
  Translation2d m_robot_line_end;
  Translation2d m_field_point;
  double m_min_distance;
};

}  // namespace trajopt
