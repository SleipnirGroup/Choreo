// Copyright (c) TrajoptLib contributors

#pragma once

#include <concepts>
#include <type_traits>
#include <variant>

#include <sleipnir/autodiff/Variable.hpp>
#include <sleipnir/optimization/OptimizationProblem.hpp>

#include "trajopt/constraint/AngularVelocityMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/LinePointConstraint.hpp"
#include "trajopt/constraint/LinearAccelerationMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/LinearVelocityDirectionConstraint.hpp"
#include "trajopt/constraint/LinearVelocityMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/PointAtConstraint.hpp"
#include "trajopt/constraint/PointLineConstraint.hpp"
#include "trajopt/constraint/PointPointConstraint.hpp"
#include "trajopt/constraint/PoseEqualityConstraint.hpp"
#include "trajopt/constraint/TranslationEqualityConstraint.hpp"
#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Translation2.hpp"

namespace trajopt {

/**
 * ConstraintType concept.
 *
 * To make TrajoptLib support a new constraint type, do the following in this
 * file:
 *
 * 1. Include the type's header file
 * 2. Add a constraint static assert for the type
 * 3. Add the type to Constraint's std::variant type list
 */
template <typename T>
concept ConstraintType =
    requires(T self, sleipnir::OptimizationProblem& problem, const Pose2v& pose,
             const Translation2v& linearVelocity,
             const sleipnir::Variable& angularVelocity,
             const Translation2v& linearAcceleration,
             const sleipnir::Variable& angularAcceleration) {
      {
        self.Apply(problem, pose, linearVelocity, angularVelocity,
                   linearAcceleration, angularAcceleration)
      } -> std::same_as<void>;
    };

static_assert(ConstraintType<AngularVelocityMaxMagnitudeConstraint>);
static_assert(ConstraintType<LinePointConstraint>);
static_assert(ConstraintType<LinearAccelerationMaxMagnitudeConstraint>);
static_assert(ConstraintType<LinearVelocityDirectionConstraint>);
static_assert(ConstraintType<LinearVelocityMaxMagnitudeConstraint>);
static_assert(ConstraintType<PointAtConstraint>);
static_assert(ConstraintType<PointLineConstraint>);
static_assert(ConstraintType<PointPointConstraint>);
static_assert(ConstraintType<PoseEqualityConstraint>);
static_assert(ConstraintType<TranslationEqualityConstraint>);

using Constraint =
    std::variant<AngularVelocityMaxMagnitudeConstraint, LinePointConstraint,
                 LinearAccelerationMaxMagnitudeConstraint,
                 LinearVelocityDirectionConstraint,
                 LinearVelocityMaxMagnitudeConstraint, PointAtConstraint,
                 PointLineConstraint, PointPointConstraint,
                 PoseEqualityConstraint, TranslationEqualityConstraint>;

}  // namespace trajopt
