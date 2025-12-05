// Copyright (c) TrajoptLib contributors

#pragma once

#include <cassert>
#include <utility>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Point-point constraint.
///
/// Specifies the required minimum distance between a point on the robot's frame
/// and a point on the field.
class TRAJOPT_DLLEXPORT PointPointMinConstraint {
 public:
  /// Constructs a LinePointConstraint.
  ///
  /// @param robot_point Robot point.
  /// @param field_point Field point.
  /// @param min_distance Minimum distance between robot line and field point.
  ///     Must be nonnegative.
  explicit PointPointMinConstraint(Translation2d robot_point,
                                   Translation2d field_point,
                                   double min_distance)
      : m_robot_point{std::move(robot_point)},
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
    auto bumper_corner =
        pose.translation() + m_robot_point.rotate_by(pose.rotation());
    auto dx = m_field_point.x() - bumper_corner.x();
    auto dy = m_field_point.y() - bumper_corner.y();
    problem.subject_to(dx * dx + dy * dy >= m_min_distance * m_min_distance);
  }

 private:
  Translation2d m_robot_point;
  Translation2d m_field_point;
  double m_min_distance;
};

}  // namespace trajopt
