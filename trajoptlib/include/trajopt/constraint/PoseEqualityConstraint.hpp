// Copyright (c) TrajoptLib contributors

#pragma once

#include <sleipnir/autodiff/Variable.hpp>
#include <sleipnir/optimization/OptimizationProblem.hpp>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * Pose equality constraint.
 */
class TRAJOPT_DLLEXPORT PoseEqualityConstraint {
 public:
  /**
   * Constructs a PoseEqualityConstraint.
   *
   * @param x The robot's x position.
   * @param y The robot's y position.
   * @param heading The robot's heading.
   */
  PoseEqualityConstraint(double x, double y, double heading)
      : m_pose{x, y, heading} {}

  /**
   * Applies this constraint to the given problem.
   *
   * @param problem The optimization problem.
   * @param pose The robot's pose.
   * @param linearVelocity The robot's linear velocity.
   * @param angularVelocity The robot's angular velocity.
   * @param linearAcceleration The robot's linear acceleration.
   * @param angularAcceleration The robot's angular acceleration.
   */
  void Apply(sleipnir::OptimizationProblem& problem, const Pose2v& pose,
             [[maybe_unused]] const Translation2v& linearVelocity,
             [[maybe_unused]] const sleipnir::Variable& angularVelocity,
             [[maybe_unused]] const Translation2v& linearAcceleration,
             [[maybe_unused]] const sleipnir::Variable& angularAcceleration) {
    problem.SubjectTo(pose == m_pose);
  }

 private:
  trajopt::Pose2d m_pose;
};

}  // namespace trajopt
