// Copyright (c) TrajoptLib contributors

#pragma once

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Linear velocity direction equality constraint.
class TRAJOPT_DLLEXPORT LinearVelocityDirectionConstraint {
 public:
  /// Constructs a LinearVelocityDirectionConstraint.
  ///
  /// @param angle The angle (radians).
  explicit LinearVelocityDirectionConstraint(double angle) : m_angle{angle} {}

  /// Applies this constraint to the given problem.
  ///
  /// @param problem The optimization problem.
  /// @param pose The robot's pose.
  /// @param linear_velocity The robot's linear velocity.
  /// @param angular_velocity The robot's angular velocity.
  /// @param linear_acceleration The robot's linear acceleration.
  /// @param angular_acceleration The robot's angular acceleration.
  void apply(
      [[maybe_unused]] slp::Problem<double>& problem,
      [[maybe_unused]] const Pose2v<double>& pose,
      const Translation2v<double>& linear_velocity,
      [[maybe_unused]] const slp::Variable<double>& angular_velocity,
      [[maybe_unused]] const Translation2v<double>& linear_acceleration,
      [[maybe_unused]] const slp::Variable<double>& angular_acceleration) {
    // <v_x, v_y> and <u_x, u_y> must be parallel
    //
    //   (v ⋅ u)/‖v‖ = 1
    //   v ⋅ u = ‖v‖
    //   (v ⋅ u)² = ‖v‖²
    auto dot = linear_velocity.dot(Translation2d{m_angle.cos(), m_angle.sin()});
    problem.subject_to(dot * dot == linear_velocity.squared_norm());
  }

 private:
  trajopt::Rotation2d m_angle;
};

}  // namespace trajopt
