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
 * 
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
    auto point = pose.Translation() + m_robotPoint.RotateBy(pose.Rotation());
    // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
    // auto denominator = sleipnir::sqrt(
    //   (m_fieldLineEnd.Y() - m_fieldLineStart.Y()) * (m_fieldLineEnd.Y() - m_fieldLineStart.Y())
    //   + (m_fieldLineEnd.X() - m_fieldLineStart.X()) * (m_fieldLineEnd.X() - m_fieldLineStart.X())
    //   );
    auto numerator = (m_fieldLineEnd.Y() - m_fieldLineStart.Y()) * point.X()
                      - (m_fieldLineEnd.X() - m_fieldLineStart.X()) * point.Y()
                      + m_fieldLineEnd.X() * m_fieldLineStart.Y()
                      - m_fieldLineEnd.Y() * m_fieldLineStart.X();
    auto dist = (numerator);
    problem.SubjectTo(dist >= 0.0);
  }

 private:
  Translation2d m_robotPoint;
  Translation2d m_fieldLineStart;
  Translation2d m_fieldLineEnd;
};

}  // namespace trajopt
