// Copyright (c) TrajoptLib contributors

#pragma once

#include <cassert>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * Linear acceleration max magnitude inequality constraint.
 */
class TRAJOPT_DLLEXPORT LinearAccelerationMaxMagnitudeConstraint {
 public:
  /**
   * Constructs a LinearAccelerationMaxMagnitudeConstraint.
   *
   * @param maxMagnitude The maximum linear acceleration magnitude. Must be
   *     nonnegative.
   */
  explicit LinearAccelerationMaxMagnitudeConstraint(double maxMagnitude)
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
  void Apply(slp::Problem& problem,
             [[maybe_unused]] const Pose2v& pose,
             [[maybe_unused]] const Translation2v& linearVelocity,
             [[maybe_unused]] const slp::Variable& angularVelocity,
             const Translation2v& linearAcceleration,
             [[maybe_unused]] const slp::Variable& angularAcceleration) {
    if (m_maxMagnitude == 0.0) {
      problem.subject_to(linearAcceleration.X() == 0.0);
      problem.subject_to(linearAcceleration.Y() == 0.0);
    } else {
      problem.subject_to(linearAcceleration.SquaredNorm() <=
                        m_maxMagnitude * m_maxMagnitude);
    }
  }

 private:
  double m_maxMagnitude;
};

}  // namespace trajopt
