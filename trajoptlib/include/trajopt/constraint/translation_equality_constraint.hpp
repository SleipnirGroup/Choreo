// Copyright (c) TrajoptLib contributors

#pragma once

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/**
 * Translation equality constraint.
 */
class TRAJOPT_DLLEXPORT TranslationEqualityConstraint {
 public:
  /**
   * Constructs a TranslationEqualityConstraint.
   *
   * @param x The robot's x position.
   * @param y The robot's y position.
   */
  TranslationEqualityConstraint(double x, double y) : m_translation{x, y} {}

  /**
   * Applies this constraint to the given problem.
   *
   * @param problem The optimization problem.
   * @param pose The robot's pose.
   * @param linear_velocity The robot's linear velocity.
   * @param angular_velocity The robot's angular velocity.
   * @param linear_acceleration The robot's linear acceleration.
   * @param angular_acceleration The robot's angular acceleration.
   */
  void apply(slp::Problem& problem, const Pose2v& pose,
             [[maybe_unused]] const Translation2v& linear_velocity,
             [[maybe_unused]] const slp::Variable& angular_velocity,
             [[maybe_unused]] const Translation2v& linear_acceleration,
             [[maybe_unused]] const slp::Variable& angular_acceleration) {
    problem.subject_to(pose.translation() == m_translation);
  }

 private:
  trajopt::Translation2d m_translation;
};

}  // namespace trajopt
