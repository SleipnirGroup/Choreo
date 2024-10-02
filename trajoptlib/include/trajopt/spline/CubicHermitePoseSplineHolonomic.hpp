// Copyright (c) TrajoptLib contributors

#pragma once

#include <algorithm>
#include <utility>
#include <vector>

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
  using PoseWithCurvature = std::pair<trajopt::Pose2d, double>;

  CubicHermitePoseSplineHolonomic(wpi::array<double, 2> xInitialControlVector,
                                  wpi::array<double, 2> xFinalControlVector,
                                  wpi::array<double, 2> yInitialControlVector,
                                  wpi::array<double, 2> yFinalControlVector,
                                  trajopt::Rotation2d r0,
                                  trajopt::Rotation2d r1)
      : r0(r0),
        theta(0.0, (-r0).RotateBy(r1).Radians(), 0, 0),
        CubicHermiteSpline(xInitialControlVector, xFinalControlVector,
                           yInitialControlVector, yFinalControlVector) {}

  trajopt::Rotation2d getCourse(double t) const {
    const PoseWithCurvature splinePoint =
        CubicHermiteSpline::GetPoint(t).value();
    return splinePoint.first.Rotation();
  }

  trajopt::Rotation2d getHeading(double t) const {
    return r0.RotateBy(trajopt::Rotation2d(theta.getPosition(t)));
  }

  double getDHeading(double t) const { return theta.getVelocity(t); }

  /**
   * Gets the pose and curvature at some point t on the spline.
   *
   * @param t The point t
   * @return The pose and curvature at that point.
   */
  std::optional<PoseWithCurvature> GetPoint(double t,
                                            bool isDifferential) const {
    if (isDifferential) {
      return CubicHermiteSpline::GetPoint(t);
    } else {
      const auto splinePoint = CubicHermiteSpline::GetPoint(t).value();
      return PoseWithCurvature{{splinePoint.first.Translation(), getHeading(t)},
                               splinePoint.second};
    }
  }

 private:
  trajopt::Rotation2d r0;
  trajopt::CubicHermiteSpline1d theta;
};
}  // namespace frc
