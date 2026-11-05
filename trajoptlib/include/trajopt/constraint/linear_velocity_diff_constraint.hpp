// Copyright (c) TrajoptLib contributors

#pragma once

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Differential drive velocity constraint.
///
/// Enforces zero lateral velocity: vx·sin(h) - vy·cos(h) = 0
///
/// The velocity vector must be parallel to the robot heading, exactly like a
/// differential drive robot. The robot may still move backward (heading
/// forward, negative speed) — this is valid differential drive behavior.
class TRAJOPT_DLLEXPORT LinearVelocityDiffConstraint {
 public:
  LinearVelocityDiffConstraint() = default;

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
      const Translation2v<double>& linear_velocity,
      [[maybe_unused]] const slp::Variable<double>& angular_velocity,
      [[maybe_unused]] const Translation2v<double>& linear_acceleration,
      [[maybe_unused]] const slp::Variable<double>& angular_acceleration) {
    // Zero lateral velocity: velocity must be parallel to heading.
    auto cross = linear_velocity.x() * pose.rotation().sin() -
                 linear_velocity.y() * pose.rotation().cos();
    problem.subject_to(cross == 0.0);
  }
};

}  // namespace trajopt
