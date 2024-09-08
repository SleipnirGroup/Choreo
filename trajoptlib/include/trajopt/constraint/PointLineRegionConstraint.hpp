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
   */
  explicit PointLineRegionConstraint(Translation2d robotPoint,
                                     Translation2d fieldLineStart,
                                     Translation2d fieldLineEnd)
      : m_robotPoint{std::move(robotPoint)},
        m_fieldLineStart{std::move(fieldLineStart)},
        m_fieldLineEnd{std::move(fieldLineEnd)} {}

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

    // Rearrange y − y₀ = m(x − x₀) where m = (y₁ − y₀)/(x₁ − x₀) into ax + by =
    // c form.

    // y − y₀ = m(x − x₀)
    // y − y₀ = (y₁ − y₀)/(x₁ − x₀)(x − x₀)
    // (x₁ − x₀)(y − y₀) = (y₁ − y₀)(x − x₀)
    // (x₁ − x₀)y − (x₁ − x₀)y₀ = (y₁ − y₀)x − (y₁ − y₀)x₀
    // (y₀ − y₁)x + (x₁ − x₀)y = −(y₁ − y₀)x₀ + (x₁ − x₀)y₀
    // (y₀ − y₁)x + (x₁ − x₀)y = (y₀ − y₁)x₀ + (x₁ − x₀)y₀

    // ax + by = c where
    //   a = y₀ − y₁
    //   b = x₁ − x₀
    //   c = (y₀ − y₁)x₀ + (x₁ − x₀)y₀
    //     = ax₀ + by₀

    // ax + by = ax₀ + by₀ where
    //   a = y₀ − y₁
    //   b = x₁ − x₀

    auto a = m_fieldLineStart.Y() - m_fieldLineEnd.Y();
    auto b = m_fieldLineEnd.X() - m_fieldLineStart.X();

    problem.SubjectTo(a * bumperCorner.X() + b * bumperCorner.Y() >
                      a * m_fieldLineStart.X() + b * m_fieldLineStart.Y());
  }

 private:
  Translation2d m_robotPoint;
  Translation2d m_fieldLineStart;
  Translation2d m_fieldLineEnd;
};

}  // namespace trajopt
