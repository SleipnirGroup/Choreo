// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <utility>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// The side of the line to stay on.
enum class Side : uint8_t {
  /// Stay above the line.
  ABOVE,
  /// Stay below the line.
  BELOW,
  /// Stay on the line.
  ON,
};

/// Point-line region constraint.
///
/// Specifies that a point on the robot must be on one side of a line defined by
/// two points on the field
class TRAJOPT_DLLEXPORT PointLineRegionConstraint {
 public:
  /// Constructs a PointLineRegionConstraint.
  ///
  /// @param robot_point Robot point.
  /// @param field_line_start Field line start.
  /// @param field_line_end Field line end.
  /// @param side The side to constrain the robot to.
  explicit PointLineRegionConstraint(Translation2d robot_point,
                                     Translation2d field_line_start,
                                     Translation2d field_line_end, Side side)
      : m_robot_point{std::move(robot_point)},
        m_field_line_start{std::move(field_line_start)},
        m_field_line_end{std::move(field_line_end)},
        m_side{side} {}

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

    // Determine which side of the start-end field line a point is on.
    //
    // The cross product a x b = |a|₂|b|₂sinθ for a and b vectors with the same
    // tail. If a x b > 0, b is to the left of a.
    //
    //   b
    //   ^
    //   |
    //   -----> a
    //
    //
    // If a x b < 0, b is to the right of a.
    //
    //   -----> a
    //   |
    //   v
    //   b
    //
    // Let a be the field line start -> end and let b be the point start ->
    // point.
    //
    //   cross > 0 means point is left of line (above)
    //   cross = 0 means point is on line
    //   cross < 0 means point is right of line (below)
    auto line = m_field_line_end - m_field_line_start;
    auto start_to_point = point - m_field_line_start;
    auto cross = line.cross(start_to_point);

    switch (m_side) {
      case Side::ABOVE:
        problem.subject_to(cross > 0);
        break;
      case Side::BELOW:
        problem.subject_to(cross < 0);
        break;
      case Side::ON:
        problem.subject_to(cross == 0);
        break;
    }
  }

 private:
  Translation2d m_robot_point;
  Translation2d m_field_line_start;
  Translation2d m_field_line_end;
  Side m_side;
};

}  // namespace trajopt
