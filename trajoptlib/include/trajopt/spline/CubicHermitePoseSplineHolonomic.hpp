// Copyright (c) TrajoptLib contributors

#pragma once

#include <array>
#include <utility>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Rotation2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/spline/CubicHermiteSpline.hpp"
#include "trajopt/spline/CubicHermiteSpline1d.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace frc {

/**
 * Represents a cubic pose spline, which is a specific implementation of a cubic
 * hermite spline.
 */
class TRAJOPT_DLLEXPORT CubicHermitePoseSplineHolonomic : CubicHermiteSpline {
 public:
  /// Pose2d with curvature.
  using PoseWithCurvature = std::pair<trajopt::Pose2d, double>;

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
                                  trajopt::Rotation2d r0,
                                  trajopt::Rotation2d r1)
      : CubicHermiteSpline(xInitialControlVector, xFinalControlVector,
                           yInitialControlVector, yFinalControlVector),
        r0(r0),
        theta(0.0, (-r0).RotateBy(r1).Radians(), 0, 0) {}

  /**
   * Return course at point t.
   *
   * @param t The point t
   * @return The course at point t.
   */
  trajopt::Rotation2d GetCourse(double t) const {
    const PoseWithCurvature splinePoint =
        CubicHermiteSpline::GetPoint(t).value();
    return splinePoint.first.Rotation();
  }

  /**
   * Return heading at point t.
   *
   * @param t The point t
   * @return The heading at point t.
   */
  trajopt::Rotation2d GetHeading(double t) const {
    return r0.RotateBy(trajopt::Rotation2d(theta.GetPosition(t)));
  }

  /**
   * Return heading rate at point t.
   *
   * @param t The point t
   * @return The heading rate at point t.
   */
  double getDHeading(double t) const { return theta.GetVelocity(t); }

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
      return PoseWithCurvature{{splinePoint.first.Translation(), GetHeading(t)},
                               splinePoint.second};
    }
  }

 private:
  trajopt::Rotation2d r0;
  trajopt::CubicHermiteSpline1d theta;
};

}  // namespace frc
