// Copyright (c) TrajoptLib contributors

#pragma once

#include <stdint.h>

#include <utility>

#include <sleipnir/autodiff/Variable.hpp>
#include <sleipnir/optimization/OptimizationProblem.hpp>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * The side of the line to stay on.
 */
enum class Side : uint8_t {
  /// Stay above the line.
  kAbove,
  /// Stay below the line.
  kBelow,
  /// Stay on the line.
  kOn,
};

/**
 * Point-line region constraint.
 *
 * Specifies that a point on the robot must be on one side of a line defined by
 * two points on the field
 */
class TRAJOPT_DLLEXPORT PointLineRegionConstraint {
 public:
  /**
   * Constructs a PointLineRegionConstraint.
   *
   * @param robotPoint Robot point.
   * @param fieldLineStart Field line start.
   * @param fieldLineEnd Field line end.
   * @param side The side to constrain the robot to.
   */
  explicit PointLineRegionConstraint(Translation2d robotPoint,
                                     Translation2d fieldLineStart,
                                     Translation2d fieldLineEnd, Side side)
      : m_robotPoint{std::move(robotPoint)},
        m_fieldLineStart{std::move(fieldLineStart)},
        m_fieldLineEnd{std::move(fieldLineEnd)},
        m_side{side} {}

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
    auto point = pose.Translation() + m_robotPoint.RotateBy(pose.Rotation());

    // Determine which side of the start-end field line a point is on.
    //
    // The cross product a x b = |a|₂|b|₂sinθ for a and b vectors with the same
    // tail. If a x b > 0, b is to the left of a.
    //
    //   b
    //   ^
    //   |
    //   -----> a
    //
    //
    // If a x b < 0, b is to the right of a.
    //
    //   -----> a
    //   |
    //   v
    //   b
    //
    // Let a be the field line start -> end and let b be the point start ->
    // point.
    //
    //   cross > 0 means point is left of line (above)
    //   cross = 0 means point is on line
    //   cross < 0 means point is right of line (below)
    auto line = m_fieldLineEnd - m_fieldLineStart;
    auto startToPoint = point - m_fieldLineStart;
    auto cross = line.Cross(startToPoint);

    switch (m_side) {
      case Side::kAbove:
        problem.SubjectTo(cross > 0);
        break;
      case Side::kBelow:
        problem.SubjectTo(cross < 0);
        break;
      case Side::kOn:
        problem.SubjectTo(cross == 0);
        break;
    }
  }

 private:
  Translation2d m_robotPoint;
  Translation2d m_fieldLineStart;
  Translation2d m_fieldLineEnd;
  Side m_side;
};

}  // namespace trajopt
