// Copyright (c) TrajoptLib contributors

#pragma once

#include <cassert>
#include <utility>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/constraint/detail/line_point_squared_distance.hpp"
#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/**
 * Point-line constraint.
 *
 * Specifies the required minimum distance between a point on the robot's frame
 * and a line segment on the field.
 */
class TRAJOPT_DLLEXPORT PointLineConstraint {
 public:
  /**
   * Constructs a PointLineConstraint.
   *
   * @param robotPoint Robot point.
   * @param fieldLineStart Field line start.
   * @param fieldLineEnd Field line end.
   * @param minDistance Minimum distance between robot point and field line.
   *     Must be nonnegative.
   */
  explicit PointLineConstraint(Translation2d robotPoint,
                               Translation2d fieldLineStart,
                               Translation2d fieldLineEnd, double minDistance)
      : m_robotPoint{std::move(robotPoint)},
        m_fieldLineStart{std::move(fieldLineStart)},
        m_fieldLineEnd{std::move(fieldLineEnd)},
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
  void Apply(slp::Problem& problem, const Pose2v& pose,
             [[maybe_unused]] const Translation2v& linearVelocity,
             [[maybe_unused]] const slp::Variable& angularVelocity,
             [[maybe_unused]] const Translation2v& linearAcceleration,
             [[maybe_unused]] const slp::Variable& angularAcceleration) {
    auto point = pose.Translation() + m_robotPoint.RotateBy(pose.Rotation());
    auto squaredDistance = detail::LinePointSquaredDistance(
        m_fieldLineStart, m_fieldLineEnd, point);
    problem.subject_to(squaredDistance >= m_minDistance * m_minDistance);
  }

 private:
  Translation2d m_robotPoint;
  Translation2d m_fieldLineStart;
  Translation2d m_fieldLineEnd;
  double m_minDistance;
};

}  // namespace trajopt
