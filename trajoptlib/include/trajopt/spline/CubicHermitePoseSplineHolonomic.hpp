// Copyright (c) TrajoptLib contributors

#pragma once

#include <array>
#include <utility>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/rotation2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/spline/CubicHermiteSpline.hpp"
#include "trajopt/spline/CubicHermiteSpline1d.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/**
 * Represents a cubic pose spline, which is a specific implementation of a cubic
 * hermite spline.
 */
class TRAJOPT_DLLEXPORT CubicHermitePoseSplineHolonomic : CubicHermiteSpline {
 public:
  /// Pose2d with curvature.
  using PoseWithCurvature = std::pair<Pose2d, double>;

  /**
   * Constructs a cubic pose spline.
   *
   * @param xInitialControlVector The control vector for the initial point in
   *     the x dimension.
   * @param xFinalControlVector The control vector for the final point in
   *     the x dimension.
   * @param yInitialControlVector The control vector for the initial point in
   *     the y dimension.
   * @param yFinalControlVector The control vector for the final point in
   *     the y dimension.
   * @param r0 Initial heading.
   * @param r1 Final heading.
   */
  CubicHermitePoseSplineHolonomic(std::array<double, 2> xInitialControlVector,
                                  std::array<double, 2> xFinalControlVector,
                                  std::array<double, 2> yInitialControlVector,
                                  std::array<double, 2> yFinalControlVector,
                                  Rotation2d r0, Rotation2d r1)
      : CubicHermiteSpline(xInitialControlVector, xFinalControlVector,
                           yInitialControlVector, yFinalControlVector),
        r0(r0),
        theta(0.0, (-r0).rotate_by(r1).radians(), 0, 0) {}

  /**
   * Return course at point t.
   *
   * @param t The point t
   * @return The course at point t.
   */
  Rotation2d GetCourse(double t) const {
    const PoseWithCurvature splinePoint =
        CubicHermiteSpline::GetPoint(t).value();
    return splinePoint.first.rotation();
  }

  /**
   * Return heading at point t.
   *
   * @param t The point t
   * @return The heading at point t.
   */
  Rotation2d GetHeading(double t) const {
    return r0.rotate_by(Rotation2d{theta.GetPosition(t)});
  }

  /**
   * Return heading rate at point t.
   *
   * @param t The point t
   * @return The heading rate at point t.
   */
  double GetHeadingRate(double t) const { return theta.GetVelocity(t); }

  /**
   * Gets the pose and curvature at some point t on the spline.
   *
   * @param t The point t
   * @param isDifferential Whether the drivetrain is a differential drive.
   * @return The pose and curvature at that point.
   */
  std::optional<PoseWithCurvature> GetPoint(double t,
                                            bool isDifferential) const {
    if (isDifferential) {
      return CubicHermiteSpline::GetPoint(t);
    } else {
      const auto splinePoint = CubicHermiteSpline::GetPoint(t).value();
      return PoseWithCurvature{{splinePoint.first.translation(), GetHeading(t)},
                               splinePoint.second};
    }
  }

 private:
  Rotation2d r0;
  CubicHermiteSpline1d theta;
};

}  // namespace trajopt
