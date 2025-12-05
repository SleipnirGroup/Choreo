// Copyright (c) TrajoptLib contributors

#pragma once

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Pose equality constraint.
class TRAJOPT_DLLEXPORT PoseEqualityConstraint {
 public:
  /// Constructs a PoseEqualityConstraint.
  ///
  /// @param x The robot's x position.
  /// @param y The robot's y position.
  /// @param heading The robot's heading.
  PoseEqualityConstraint(double x, double y, double heading)
      : m_pose{x, y, heading} {}

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
    problem.subject_to(pose == m_pose);
  }

 private:
  trajopt::Pose2d m_pose;
};

}  // namespace trajopt
