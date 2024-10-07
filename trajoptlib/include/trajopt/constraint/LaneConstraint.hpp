// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <optional>

#include "trajopt/constraint/PointLineRegionConstraint.hpp"
#include "trajopt/geometry/Rotation2.hpp"
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
   * @param centerLineStart Start point of the center line.
   * @param centerLineEnd End point of the center line.
   * @param tolerance Distance from center line to lane edge. Passing zero
   *   creates a line constraint.
   */
  LaneConstraint(Translation2d centerLineStart, Translation2d centerLineEnd,
                 double tolerance)
      : m_topLine{[&] {
          if (tolerance != 0.0) {
            double dx = centerLineEnd.X() - centerLineStart.X();
            double dy = centerLineEnd.Y() - centerLineStart.Y();
            double dist = std::hypot(dx, dy);
            auto offset = Translation2d{0.0, tolerance}.RotateBy(
                Rotation2d{dx / dist, dy / dist});

            return PointLineRegionConstraint{{0.0, 0.0},
                                             centerLineStart + offset,
                                             centerLineEnd + offset,
                                             Side::kBelow};
          } else {
            return PointLineRegionConstraint{robotPoint, centerLineStart,
                                             centerLineEnd, Side::kOn};
          }
        }()},
        m_bottomLine{[&]() -> std::optional<PointLineRegionConstraint> {
          if (tolerance != 0.0) {
            double dx = centerLineEnd.X() - centerLineStart.X();
            double dy = centerLineEnd.Y() - centerLineStart.Y();
            double dist = std::hypot(dx, dy);
            auto offset = Translation2d{0.0, tolerance}.RotateBy(
                Rotation2d{dx / dist, dy / dist});

            return PointLineRegionConstraint{{0.0, 0.0},
                                             centerLineStart - offset,
                                             centerLineEnd - offset,
                                             Side::kAbove};
          } else {
            return std::nullopt;
          }
        }()} {}

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
    m_topLine.Apply(problem, pose, linearVelocity, angularVelocity,
                    linearAcceleration, angularAcceleration);
    if (m_bottomLine.has_value()) {
      m_bottomLine.value().Apply(problem, pose, linearVelocity, angularVelocity,
                                 linearAcceleration, angularAcceleration);
    }
  }

 private:
  PointLineRegionConstraint m_topLine;
  std::optional<PointLineRegionConstraint> m_bottomLine;
};

}  // namespace trajopt
