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

/// Point-at constraint.
///
/// Specifies a point on the field at which the robot should point.
class TRAJOPT_DLLEXPORT PointAtConstraint {
 public:
  /// Constructs a PointAtConstraint.
  ///
  /// @param field_point Field point.
  /// @param heading_tolerance The allowed robot heading tolerance (radians).
  ///     Must be nonnegative.
  /// @param flip False points at the field point while true points away from
  ///     the field point.
  explicit PointAtConstraint(Translation2d field_point,
                             double heading_tolerance, bool flip = false)
      : m_field_point{std::move(field_point)},
        m_heading_tolerance{heading_tolerance},
        m_flip{flip} {
    assert(m_heading_tolerance >= 0.0);
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
    // dx,dy = desired heading
    // ux,uy = unit vector of desired heading
    // hx,hy = heading
    // dot = dot product of ux,uy and hx,hy
    //
    // constrain dot to cos(1.0), which is colinear
    // and cos(theta_tolerance)
    auto dx = m_field_point.x() - pose.x();
    auto dy = m_field_point.y() - pose.y();
    auto dot = pose.rotation().cos() * dx + pose.rotation().sin() * dy;
    if (!m_flip) {
      // dot close to 1 * hypot (point toward)
      problem.subject_to(dot >=
                         std::cos(m_heading_tolerance) * slp::hypot(dx, dy));
    } else {
      // dot close to -1 * hypot (point away)
      problem.subject_to(dot <=
                         -std::cos(m_heading_tolerance) * slp::hypot(dx, dy));
    }
  }

 private:
  Translation2d m_field_point;
  double m_heading_tolerance;
  bool m_flip;
};

}  // namespace trajopt
