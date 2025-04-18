// Copyright (c) TrajoptLib contributors

#pragma once

#include <cassert>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/**
 * Linear velocity max magnitude inequality constraint.
 */
class TRAJOPT_DLLEXPORT LinearVelocityMaxMagnitudeConstraint {
 public:
  /**
   * Constructs a LinearVelocityMaxMagnitudeConstraint.
   *
   * @param maxMagnitude The maximum linear velocity magnitude. Must be
   *     nonnegative.
   */
  explicit LinearVelocityMaxMagnitudeConstraint(double maxMagnitude)
      : m_maxMagnitude{maxMagnitude} {
    assert(maxMagnitude >= 0.0);
  }

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
  void Apply(slp::Problem& problem, [[maybe_unused]] const Pose2v& pose,
             const Translation2v& linearVelocity,
             [[maybe_unused]] const slp::Variable& angularVelocity,
             [[maybe_unused]] const Translation2v& linearAcceleration,
             [[maybe_unused]] const slp::Variable& angularAcceleration) {
    if (m_maxMagnitude == 0.0) {
      problem.subject_to(linearVelocity.X() == 0.0);
      problem.subject_to(linearVelocity.Y() == 0.0);
    } else {
      problem.subject_to(linearVelocity.SquaredNorm() <=
                         m_maxMagnitude * m_maxMagnitude);
    }
  }

 private:
  double m_maxMagnitude;
};

}  // namespace trajopt
