// Copyright (c) TrajoptLib contributors

#pragma once

#include <utility>

#include <frc/spline/CubicHermiteSpline.h>

#include "spline/CubicHermiteSpline1d.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {
/**
 * Represents a cubic pose spline, which is a specific implementation of a cubic
 * hermite spline.
 */
class TRAJOPT_DLLEXPORT CubicHermitePoseSplineHolonomic {
 public:
  using PoseWithCurvature = std::pair<frc::Pose2d, units::curvature_t>;
  CubicHermitePoseSplineHolonomic(wpi::array<double, 2> xInitialControlVector,
                                  wpi::array<double, 2> xFinalControlVector,
                                  wpi::array<double, 2> yInitialControlVector,
                                  wpi::array<double, 2> yFinalControlVector,
                                  frc::Rotation2d r0, frc::Rotation2d r1)
      : r0(r0),
        theta(0.0, (-r0).RotateBy(r1).Radians().value(), 0, 0),
        spline(xInitialControlVector, xFinalControlVector,
               yInitialControlVector, yFinalControlVector) {}

  CubicHermitePoseSplineHolonomic(frc::CubicHermiteSpline spline,
                                  frc::Rotation2d r0, frc::Rotation2d r1)
      : r0(r0),
        theta(0.0, (-r0).RotateBy(r1).Radians().value(), 0, 0),
        spline(spline.GetInitialControlVector().x,
               spline.GetFinalControlVector().x,
               spline.GetInitialControlVector().y,
               spline.GetFinalControlVector().y) {}

  frc::Rotation2d getCourse(double t) const {
    const auto splinePoint = spline.GetPoint(t);
    return splinePoint.first.Rotation();
  }

  frc::Rotation2d getHeading(double t) const {
    return r0.RotateBy(frc::Rotation2d(units::radian_t(theta.getPosition(t))));
  }

  double getDHeading(double t) const { return theta.getVelocity(t); }

  /**
   * Gets the pose and curvature at some point t on the spline.
   *
   * @param t The point t
   * @return The pose and curvature at that point.
   */
  PoseWithCurvature GetPoint(double t) const {
    const auto splinePoint = spline.GetPoint(t);
    return {{splinePoint.first.Translation(), getHeading(t)},
            splinePoint.second};
  }

 private:
  frc::Rotation2d r0;
  CubicHermiteSpline1d theta;
  frc::CubicHermiteSpline spline;
};
}  // namespace trajopt
