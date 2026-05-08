// Copyright (c) TrajoptLib contributors

#pragma once

#include <array>
#include <utility>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/rotation2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/spline/cubic_hermite_spline.hpp"
#include "trajopt/spline/cubic_hermite_spline1d.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Represents a cubic pose spline, which is a specific implementation of a
/// cubic hermite spline.
class TRAJOPT_DLLEXPORT CubicHermitePoseSplineHolonomic : CubicHermiteSpline {
 public:
  /// Pose2d with curvature.
  using PoseWithCurvature = std::pair<Pose2d, double>;

  /// Constructs a cubic pose spline.
  ///
  /// @param x_initial_control_vector The control vector for the initial point
  ///     in the x dimension.
  /// @param x_final_control_vector The control vector for the final point in
  ///     the x dimension.
  /// @param y_initial_control_vector The control vector for the initial point
  ///     in the y dimension.
  /// @param y_final_control_vector The control vector for the final point in
  ///     the y dimension.
  /// @param r0 Initial heading.
  /// @param r1 Final heading.
  CubicHermitePoseSplineHolonomic(
      std::array<double, 2> x_initial_control_vector,
      std::array<double, 2> x_final_control_vector,
      std::array<double, 2> y_initial_control_vector,
      std::array<double, 2> y_final_control_vector, Rotation2d r0,
      Rotation2d r1)
      : CubicHermiteSpline(x_initial_control_vector, x_final_control_vector,
                           y_initial_control_vector, y_final_control_vector),
        r0(r0),
        theta(0.0, (-r0).rotate_by(r1).radians(), 0, 0) {}

  /// Return course at point t.
  ///
  /// @param t The point t
  /// @return The course at point t.
  Rotation2d GetCourse(double t) const {
    const PoseWithCurvature spline_point =
        CubicHermiteSpline::get_point(t).value();
    return spline_point.first.rotation();
  }

  /// Return heading at point t.
  ///
  /// @param t The point t
  /// @return The heading at point t.
  Rotation2d get_heading(double t) const {
    return r0.rotate_by(Rotation2d{theta.get_position(t)});
  }

  /// Return heading rate at point t.
  ///
  /// @param t The point t
  /// @return The heading rate at point t.
  double get_heading_rate(double t) const { return theta.get_velocity(t); }

  /// Gets the pose and curvature at some point t on the spline.
  ///
  /// @param t The point t
  /// @param is_differential Whether the drivetrain is a differential drive.
  /// @return The pose and curvature at that point.
  std::optional<PoseWithCurvature> get_point(double t,
                                             bool is_differential) const {
    if (is_differential) {
      return CubicHermiteSpline::get_point(t);
    } else {
      const auto spline_point = CubicHermiteSpline::get_point(t).value();
      return PoseWithCurvature{
          {spline_point.first.translation(), get_heading(t)},
          spline_point.second};
    }
  }

 private:
  Rotation2d r0;
  CubicHermiteSpline1d theta;
};

}  // namespace trajopt
