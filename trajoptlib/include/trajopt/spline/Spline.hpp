// Copyright (c) TrajoptLib contributors

#pragma once

#include <optional>
#include <utility>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/spline/EigenCore.hpp"
#include "trajopt/spline/array.hpp"

namespace frc {
/**
 * Represents a two-dimensional parametric spline that interpolates between two
 * points.
 *
 * @tparam Degree The degree of the spline.
 */
template <int Degree>
class Spline {
 public:
  using PoseWithCurvature = std::pair<trajopt::Pose2d, double>;

  Spline() = default;

  Spline(const Spline&) = default;
  Spline& operator=(const Spline&) = default;

  Spline(Spline&&) = default;
  Spline& operator=(Spline&&) = default;

  virtual ~Spline() = default;

  /**
   * Represents a control vector for a spline.
   *
   * Each element in each array represents the value of the derivative at the
   * index. For example, the value of x[2] is the second derivative in the x
   * dimension.
   */
  struct ControlVector {
    /// The x components of the control vector.
    wpi::array<double, (Degree + 1) / 2> x;

    /// The y components of the control vector.
    wpi::array<double, (Degree + 1) / 2> y;
  };

  /**
   * Gets the pose and curvature at some point t on the spline.
   *
   * @param t The point t
   * @return The pose and curvature at that point.
   */
  std::optional<PoseWithCurvature> GetPoint(double t) const {
    Vectord<Degree + 1> polynomialBases;

    // Populate the polynomial bases
    for (int i = 0; i <= Degree; i++) {
      polynomialBases(i) = std::pow(t, Degree - i);
    }

    // This simply multiplies by the coefficients. We need to divide out t some
    // n number of times where n is the derivative we want to take.
    Vectord<6> combined = Coefficients() * polynomialBases;

    double dx, dy, ddx, ddy;

    // If t = 0, all other terms in the equation cancel out to zero. We can use
    // the last x^0 term in the equation.
    if (t == 0.0) {
      dx = Coefficients()(2, Degree - 1);
      dy = Coefficients()(3, Degree - 1);
      ddx = Coefficients()(4, Degree - 2);
      ddy = Coefficients()(5, Degree - 2);
    } else {
      // Divide out t for first derivative.
      dx = combined(2) / t;
      dy = combined(3) / t;

      // Divide out t for second derivative.
      ddx = combined(4) / t / t;
      ddy = combined(5) / t / t;
    }

    if (std::hypot(dx, dy) < 1e-6) {
      return std::nullopt;
    }

    // Find the curvature.
    const auto curvature =
        (dx * ddy - ddx * dy) / ((dx * dx + dy * dy) * std::hypot(dx, dy));

    return PoseWithCurvature{{FromVector(combined.template block<2, 1>(0, 0)),
                              trajopt::Rotation2d{dx, dy}},
                             curvature};
  }

  /**
   * Returns the coefficients of the spline.
   *
   * @return The coefficients of the spline.
   */
  virtual Matrixd<6, Degree + 1> Coefficients() const = 0;

  /**
   * Returns the initial control vector that created this spline.
   *
   * @return The initial control vector that created this spline.
   */
  virtual const ControlVector& GetInitialControlVector() const = 0;

  /**
   * Returns the final control vector that created this spline.
   *
   * @return The final control vector that created this spline.
   */
  virtual const ControlVector& GetFinalControlVector() const = 0;

 protected:
  /**
   * Converts a Translation2d into a vector that is compatible with Eigen.
   *
   * @param translation The Translation2d to convert.
   * @return The vector.
   */
  static Eigen::Vector2d ToVector(const trajopt::Translation2d& translation) {
    return Eigen::Vector2d{translation.X(), translation.Y()};
  }

  /**
   * Converts an Eigen vector into a Translation2d.
   *
   * @param vector The vector to convert.
   * @return The Translation2d.
   */
  static trajopt::Translation2d FromVector(const Eigen::Vector2d& vector) {
    return trajopt::Translation2d{vector(0), vector(1)};
  }
};
}  // namespace frc
