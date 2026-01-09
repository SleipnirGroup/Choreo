// Copyright (c) TrajoptLib contributors

#pragma once

#include <array>
#include <optional>
#include <utility>

#include <Eigen/Core>

#include "trajopt/geometry/pose2.hpp"

namespace trajopt {

/// Represents a two-dimensional parametric spline that interpolates between two
/// points.
///
/// @tparam Degree The degree of the spline.
template <int Degree>
class Spline {
 public:
  /// Pose2d with curvature
  using PoseWithCurvature = std::pair<Pose2d, double>;

  virtual ~Spline() = default;

  /// Represents a control vector for a spline.
  ///
  /// Each element in each array represents the value of the derivative at the
  /// index. For example, the value of x[2] is the second derivative in the x
  /// dimension.
  struct ControlVector {
    /// The x components of the control vector.
    std::array<double, (Degree + 1) / 2> x;

    /// The y components of the control vector.
    std::array<double, (Degree + 1) / 2> y;
  };

  /// Gets the pose and curvature at some point t on the spline.
  ///
  /// @param t The point t
  /// @return The pose and curvature at that point.
  std::optional<PoseWithCurvature> get_point(double t) const {
    Eigen::Vector<double, Degree + 1> polynomial_bases;

    // Populate the polynomial bases
    for (int i = 0; i <= Degree; i++) {
      polynomial_bases(i) = std::pow(t, Degree - i);
    }

    // This simply multiplies by the coefficients. We need to divide out t some
    // n number of times where n is the derivative we want to take.
    Eigen::Vector<double, 6> combined = coefficients() * polynomial_bases;

    double dx, dy, ddx, ddy;

    // If t = 0, all other terms in the equation cancel out to zero. We can use
    // the last x⁰ term in the equation.
    if (t == 0.0) {
      dx = coefficients()(2, Degree - 1);
      dy = coefficients()(3, Degree - 1);
      ddx = coefficients()(4, Degree - 2);
      ddy = coefficients()(5, Degree - 2);
    } else {
      // Divide out t for first derivative.
      dx = combined[2] / t;
      dy = combined[3] / t;

      // Divide out t for second derivative.
      ddx = combined[4] / t / t;
      ddy = combined[5] / t / t;
    }

    if (std::hypot(dx, dy) < 1e-6) {
      return std::nullopt;
    }

    // Find the curvature.
    const auto curvature =
        (dx * ddy - ddx * dy) / ((dx * dx + dy * dy) * std::hypot(dx, dy));

    return PoseWithCurvature{
        {Translation2d{combined[0], combined[1]}, Rotation2d{dx, dy}},
        curvature};
  }

  /// Returns the coefficients of the spline.
  ///
  /// @return The coefficients of the spline.
  virtual const Eigen::Matrix<double, 6, Degree + 1>& coefficients() const = 0;

  /// Returns the initial control vector that created this spline.
  ///
  /// @return The initial control vector that created this spline.
  virtual const ControlVector& get_initial_control_vector() const = 0;

  /// Returns the final control vector that created this spline.
  ///
  /// @return The final control vector that created this spline.
  virtual const ControlVector& get_final_control_vector() const = 0;
};

}  // namespace trajopt
