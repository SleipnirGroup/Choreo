// Copyright (c) TrajoptLib contributors

#pragma once

#include <concepts>
#include <variant>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>

#include "trajopt/constraint/angular_velocity_max_magnitude_constraint.hpp"
#include "trajopt/constraint/lane_constraint.hpp"
#include "trajopt/constraint/line_point_constraint.hpp"
#include "trajopt/constraint/linear_acceleration_max_magnitude_constraint.hpp"
#include "trajopt/constraint/linear_velocity_direction_constraint.hpp"
#include "trajopt/constraint/linear_velocity_max_magnitude_constraint.hpp"
#include "trajopt/constraint/point_at_constraint.hpp"
#include "trajopt/constraint/point_line_constraint.hpp"
#include "trajopt/constraint/point_line_region_constraint.hpp"
#include "trajopt/constraint/point_point_max_constraint.hpp"
#include "trajopt/constraint/point_point_min_constraint.hpp"
#include "trajopt/constraint/pose_equality_constraint.hpp"
#include "trajopt/constraint/translation_equality_constraint.hpp"
#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"

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
    requires(T self, slp::Problem<double>& problem, const Pose2v<double>& pose,
             const Translation2v<double>& linear_velocity,
             const slp::Variable<double>& angular_velocity,
             const Translation2v<double>& linear_acceleration,
             const slp::Variable<double>& angular_acceleration) {
      {
        self.apply(problem, pose, linear_velocity, angular_velocity,
                   linear_acceleration, angular_acceleration)
      } -> std::same_as<void>;
    };

static_assert(ConstraintType<AngularVelocityMaxMagnitudeConstraint>);
static_assert(ConstraintType<LaneConstraint>);
static_assert(ConstraintType<LinePointConstraint>);
static_assert(ConstraintType<LinearAccelerationMaxMagnitudeConstraint>);
static_assert(ConstraintType<LinearVelocityDirectionConstraint>);
static_assert(ConstraintType<LinearVelocityMaxMagnitudeConstraint>);
static_assert(ConstraintType<PointAtConstraint>);
static_assert(ConstraintType<PointLineConstraint>);
static_assert(ConstraintType<PointLineRegionConstraint>);
static_assert(ConstraintType<PointPointMaxConstraint>);
static_assert(ConstraintType<PointPointMinConstraint>);
static_assert(ConstraintType<PoseEqualityConstraint>);
static_assert(ConstraintType<TranslationEqualityConstraint>);

using Constraint = std::variant<
    // clang-format off
    AngularVelocityMaxMagnitudeConstraint,
    LaneConstraint,
    LinePointConstraint,
    LinearAccelerationMaxMagnitudeConstraint,
    LinearVelocityDirectionConstraint,
    LinearVelocityMaxMagnitudeConstraint,
    PointAtConstraint,
    PointLineConstraint,
    PointLineRegionConstraint,
    PointPointMaxConstraint,
    PointPointMinConstraint,
    PoseEqualityConstraint,
    TranslationEqualityConstraint
    // clang-format on
    >;

}  // namespace trajopt
