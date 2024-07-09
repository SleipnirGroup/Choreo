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
 * Point-point constraint.
 *
 * Specifies the required minimum distance between a point on the robot's frame
 * and a point on the field.
 */
class TRAJOPT_DLLEXPORT PointPointConstraint {
 public:
  /**
   * Constructs a LinePointConstraint.
   *
   * @param robotPoint Robot point.
   * @param fieldPoint Field point.
   * @param minDistance Minimum distance between robot line and field point.
   *     Must be nonnegative.
   */
  explicit PointPointConstraint(Translation2d robotPoint,
                                Translation2d fieldPoint, double minDistance)
      : m_robotPoint{std::move(robotPoint)},
        m_fieldPoint{std::move(fieldPoint)},
        m_minDistance{minDistance} {
    assert(minDistance >= 0.0);
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
    auto bumperCorner =
        pose.Translation() + m_robotPoint.RotateBy(pose.Rotation());
    auto dx = m_fieldPoint.X() - bumperCorner.X();
    auto dy = m_fieldPoint.Y() - bumperCorner.Y();
    problem.SubjectTo(dx * dx + dy * dy >= m_minDistance * m_minDistance);
  }

 private:
  Translation2d m_robotPoint;
  Translation2d m_fieldPoint;
  double m_minDistance;
};

}  // namespace trajopt
