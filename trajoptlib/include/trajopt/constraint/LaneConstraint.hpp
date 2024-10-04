// Copyright (c) TrajoptLib contributors

#pragma once

#include <optional>

#include "trajopt/constraint/PointLineRegionConstraint.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * Lane Constraint.
 *
 * Specifies the robot must stay between two lines.
 */
class TRAJOPT_DLLEXPORT LaneConstraint {
 public:
  /**
   * Constructs a LaneConstraint.
   *
   * @param robotPoint Robot point.
   * @param topLineStart Start point of the top line.
   * @param topLineEnd End point of the top line.
   * @param bottomLineStart Start point of the bottom line.
   * @param bottomLineEnd End point of the bottom line.
   */
  explicit LaneConstraint(Translation2d robotPoint, Translation2d topLineStart,
                          Translation2d topLineEnd,
                          Translation2d bottomLineStart,
                          Translation2d bottomLineEnd)
      : m_topLine{robotPoint, topLineStart, topLineEnd, Side::Below},
        m_bottomLine{std::make_optional(PointLineRegionConstraint{
            robotPoint, bottomLineStart, bottomLineEnd, Side::Above})} {}

  /**
   * Constructs a LaneConstraint.
   *
   * @param robotPoint Robot point.
   * @param lineStart Start point of the line.
   * @param lineEnd End point of the line.
   */
  explicit LaneConstraint(Translation2d robotPoint, Translation2d lineStart,
                          Translation2d lineEnd)
      : m_topLine{robotPoint, lineStart, lineEnd, Side::On} {}

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
             const Translation2v& linearVelocity,
             const sleipnir::Variable& angularVelocity,
             const Translation2v& linearAcceleration,
             const sleipnir::Variable& angularAcceleration) {
    if (m_bottomLine.has_value()) {
      m_topLine.Apply(problem, pose, linearVelocity, angularVelocity,
                      linearAcceleration, angularAcceleration);
      m_bottomLine.value().Apply(problem, pose, linearVelocity, angularVelocity,
                                 linearAcceleration, angularAcceleration);
    } else {
      m_topLine.Apply(problem, pose, linearVelocity, angularVelocity,
                      linearAcceleration, angularAcceleration);
    }
  }

 private:
  PointLineRegionConstraint m_topLine;
  std::optional<PointLineRegionConstraint> m_bottomLine;
};

}  // namespace trajopt
