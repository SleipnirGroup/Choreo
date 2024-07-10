// Copyright (c) TrajoptLib contributors

#pragma once

#include <cassert>
#include <utility>

#include <sleipnir/autodiff/Variable.hpp>
#include <sleipnir/optimization/OptimizationProblem.hpp>

#include "trajopt/constraint/detail/LinePointDistance.hpp"
#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * Line-point constraint.
 *
 * Specifies the required minimum distance between a line segment on the
 * robot's frame and a point on the field.
 */
class TRAJOPT_DLLEXPORT LinePointConstraint {
 public:
  /**
   * Constructs a LinePointConstraint.
   *
   * @param robotLineStart Robot line start.
   * @param robotLineEnd Robot line end.
   * @param fieldPoint Field point.
   * @param minDistance Minimum distance between robot line and field point.
   *     Must be nonnegative.
   */
  explicit LinePointConstraint(Translation2d robotLineStart,
                               Translation2d robotLineEnd,
                               Translation2d fieldPoint, double minDistance)
      : m_robotLineStart{std::move(robotLineStart)},
        m_robotLineEnd{std::move(robotLineEnd)},
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
    auto lineStart =
        pose.Translation() + m_robotLineStart.RotateBy(pose.Rotation());
    auto lineEnd =
        pose.Translation() + m_robotLineEnd.RotateBy(pose.Rotation());
    auto dist = detail::LinePointDistance(lineStart, lineEnd, m_fieldPoint);
    problem.SubjectTo(dist * dist >= m_minDistance * m_minDistance);
  }

 private:
  Translation2d m_robotLineStart;
  Translation2d m_robotLineEnd;
  Translation2d m_fieldPoint;
  double m_minDistance;
};

}  // namespace trajopt
