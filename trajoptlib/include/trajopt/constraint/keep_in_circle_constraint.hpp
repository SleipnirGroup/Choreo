// Copyright (c) TrajoptLib contributors

#pragma once

#include <cassert>
#include <utility>
#include <variant>
#include <vector>
#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/problem.hpp>
#include "trajopt/constraint/keep_out_region.hpp"
#include "trajopt/constraint/point_point_max_constraint.hpp"
#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Point-point minimum constraint.
///
/// Specifies the required minimum distance between a point on the robot's frame
/// and a point on the field.
class TRAJOPT_DLLEXPORT KeepInCircleConstraint {
 public:
  /// Constructs a KeepInCircleConstraint.
  ///
  /// @param bumpers Any robot-relative KeepOutRegions to stay inside the circle.
  /// @param field_point Field point.
  /// @param min_distance Minimum distance between robot line and field point.
  ///     Must be nonnegative.
  explicit KeepInCircleConstraint(std::vector<trajopt::KeepOutRegion> bumpers,
                                   Translation2d field_point,
                                   double min_distance) {
    assert(min_distance >= 0.0);
    for (size_t bumper = 0; bumper < bumpers.size();
       bumper++) {
    for (size_t i = 0; i < bumpers.at(bumper).points.size();
         i++) {
      constraints.push_back(trajopt::PointPointMaxConstraint{
                     bumpers.at(bumper).points.at(i),
                     field_point,
                     min_distance});
    }
  }
  constraints.push_back(
      trajopt::PointPointMaxConstraint{
                 {0.0, 0.0}, field_point, min_distance});
  }
  

  /// Applies this constraint to the given problem.
  ///
  /// @param problem The optimization problem.
  /// @param pose The robot's pose.
  /// @param linear_velocity The robot's linear velocity.
  /// @param angular_velocity The robot's angular velocity.
  /// @param linear_acceleration The robot's linear acceleration.
  /// @param angular_acceleration The robot's angular acceleration.
  void apply(
      slp::Problem<double>& problem, const Pose2v<double>& pose,
      [[maybe_unused]] const Translation2v<double>& linear_velocity,
      [[maybe_unused]] const slp::Variable<double>& angular_velocity,
      [[maybe_unused]] const Translation2v<double>& linear_acceleration,
      [[maybe_unused]] const slp::Variable<double>& angular_acceleration) {
    for (auto constraint : constraints) {
            constraint.apply(problem, pose, linear_velocity, angular_velocity,
                    linear_acceleration, angular_acceleration);
            }
  }

 private:
  std::vector<PointPointMaxConstraint> constraints;
};

}  // namespace trajopt
