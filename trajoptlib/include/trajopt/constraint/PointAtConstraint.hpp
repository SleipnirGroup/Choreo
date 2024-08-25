// Copyright (c) TrajoptLib contributors

#pragma once

#include <cassert>
#include <utility>

#include <sleipnir/autodiff/Variable.hpp>
#include <sleipnir/optimization/OptimizationProblem.hpp>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * Point-at constraint.
 *
 * Specifies a point on the field at which the robot should point.
 */
class TRAJOPT_DLLEXPORT PointAtConstraint {
 public:
  /**
   * Cosntructs a PointAtConstraint.
   *
   * @param fieldPoint Field point.
   * @param headingTolerance The allowed robot heading tolerance (radians). Must
   *     be nonnegative.
   */
  explicit PointAtConstraint(Translation2d fieldPoint, double headingTolerance,
                             bool flip = false)
      : m_fieldPoint{std::move(fieldPoint)},
        m_headingTolerance{headingTolerance},
        m_flip{flip} {
    assert(m_headingTolerance >= 0.0);
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
  void Apply(sleipnir::OptimizationProblem& problem, const Pose2v& pose,
             [[maybe_unused]] const Translation2v& linearVelocity,
             [[maybe_unused]] const sleipnir::Variable& angularVelocity,
             [[maybe_unused]] const Translation2v& linearAcceleration,
             [[maybe_unused]] const sleipnir::Variable& angularAcceleration) {
    // dx,dy = desired heading
    // ux,uy = unit vector of desired heading
    // hx,hy = heading
    // dot = dot product of ux,uy and hx,hy
    //
    // constrain dot to cos(1.0), which is colinear
    // and cos(thetaTolerance)
    auto dx = m_fieldPoint.X() - pose.X();
    auto dy = m_fieldPoint.Y() - pose.Y();
    auto dot = pose.Rotation().Cos() * dx + pose.Rotation().Sin() * dy;
    if (!m_flip) {
      // dot close to 1 * hypot (point toward)
      problem.SubjectTo(dot >=
                        std::cos(m_headingTolerance) * sleipnir::hypot(dx, dy));
    } else {
      // dot close to -1 * hypot (point away)
      problem.SubjectTo(dot <= -std::cos(m_headingTolerance) *
                                   sleipnir::hypot(dx, dy));
    }
  }

 private:
  Translation2d m_fieldPoint;
  double m_headingTolerance;
  bool m_flip;
};

}  // namespace trajopt
