// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <optional>

#include "trajopt/constraint/point_line_region_constraint.hpp"
#include "trajopt/geometry/rotation2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Lane Constraint.
///
/// Specifies the robot must stay between two lines.
class TRAJOPT_DLLEXPORT LaneConstraint {
 public:
  /// Constructs a LaneConstraint.
  ///
  /// @param center_line_start Start point of the center line.
  /// @param center_line_end End point of the center line.
  /// @param tolerance Distance from center line to lane edge. Passing zero
  ///     creates a line constraint.
  LaneConstraint(Translation2d center_line_start, Translation2d center_line_end,
                 double tolerance)
      : m_top_line{[&] {
          if (tolerance != 0.0) {
            double dx = center_line_end.x() - center_line_start.x();
            double dy = center_line_end.y() - center_line_start.y();
            double dist = std::hypot(dx, dy);
            auto offset = Translation2d{0.0, tolerance}.rotate_by(
                Rotation2d{dx / dist, dy / dist});

            return PointLineRegionConstraint{{0.0, 0.0},
                                             center_line_start + offset,
                                             center_line_end + offset,
                                             Side::BELOW};
          } else {
            return PointLineRegionConstraint{
                {0.0, 0.0}, center_line_start, center_line_end, Side::ON};
          }
        }()},
        m_bottom_line{[&]() -> std::optional<PointLineRegionConstraint> {
          if (tolerance != 0.0) {
            double dx = center_line_end.x() - center_line_start.x();
            double dy = center_line_end.y() - center_line_start.y();
            double dist = std::hypot(dx, dy);
            auto offset = Translation2d{0.0, tolerance}.rotate_by(
                Rotation2d{dx / dist, dy / dist});

            return PointLineRegionConstraint{{0.0, 0.0},
                                             center_line_start - offset,
                                             center_line_end - offset,
                                             Side::ABOVE};
          } else {
            return std::nullopt;
          }
        }()} {}

  /// Applies this constraint to the given problem.
  ///
  /// @param problem The optimization problem.
  /// @param pose The robot's pose.
  /// @param linear_velocity The robot's linear velocity.
  /// @param angular_velocity The robot's angular velocity.
  /// @param linear_acceleration The robot's linear acceleration.
  /// @param angular_acceleration The robot's angular acceleration.
  void apply(slp::Problem<double>& problem, const Pose2v<double>& pose,
             const Translation2v<double>& linear_velocity,
             const slp::Variable<double>& angular_velocity,
             const Translation2v<double>& linear_acceleration,
             const slp::Variable<double>& angular_acceleration) {
    m_top_line.apply(problem, pose, linear_velocity, angular_velocity,
                     linear_acceleration, angular_acceleration);
    if (m_bottom_line.has_value()) {
      m_bottom_line.value().apply(problem, pose, linear_velocity,
                                  angular_velocity, linear_acceleration,
                                  angular_acceleration);
    }
  }

 private:
  PointLineRegionConstraint m_top_line;
  std::optional<PointLineRegionConstraint> m_bottom_line;
};

}  // namespace trajopt
