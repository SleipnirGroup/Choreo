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

/// ConstraintLike concept.
template <typename T>
concept ConstraintLike =
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

/// List of constraint types (must satisfy ConstraintLike concept).
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

template <typename>
struct HoldsConstraintTypes;

/// Type trait that evaluates to true if variant only holds constraint types.
template <typename... Ts>
struct HoldsConstraintTypes<std::variant<Ts...>> {
  /// True if variant only holds constraint types.
  static constexpr bool value = (ConstraintLike<Ts> && ...);
};

static_assert(HoldsConstraintTypes<Constraint>::value);

}  // namespace trajopt
