// Copyright (c) TrajoptLib contributors

#pragma once

#include <algorithm>
#include <iostream>
#include <vector>

#include <Eigen/Core>
#include <unsupported/Eigen/Splines>

#include "trajopt/spline/Spline.h"
#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Rotation2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

typedef Eigen::Spline<double, 1> Spline1D;
typedef Eigen::SplineFitting<Spline1D> SplineFitting1D;
typedef Eigen::SplineFitting<Eigen::Spline<double, 2>> SplineFitting2D;

class TRAJOPT_DLLEXPORT PoseSplineHolonomic {
 public:
  explicit PoseSplineHolonomic(std::vector<Pose2d> waypoints) {
    size_t num_wpts = waypoints.size();

    std::vector<double> vx, vy, sins, coss;
    vx.reserve(num_wpts);
    vy.reserve(num_wpts);
    sins.reserve(num_wpts);
    coss.reserve(num_wpts);
    std::vector<Rotation2d> headings;
    headings.reserve(waypoints.size());
    for (size_t i = 0; i < num_wpts; ++i) {
      const auto w = waypoints[i];
      vx.push_back(w.X());
      vy.push_back(w.Y());
      coss.push_back(std::cos(w.Rotation().Radians()));
      sins.push_back(std::sin(w.Rotation().Radians()));
      times.push_back(static_cast<double>(i));
    }

    xSpline.set_points(times, vx, tk::spline::cspline_hermite);
    ySpline.set_points(times, vy, tk::spline::cspline_hermite);
    cosSpline.set_points(times, coss, tk::spline::cspline_hermite);
    sinSpline.set_points(times, sins, tk::spline::cspline_hermite);

    for (double t = 0; t <= getEndT(); t += 0.25) {
      auto values = getTranslation(t);
      auto head = getHeading(t);
      std::printf("time: %.2f \tx: %.2f\t\ty: %.2f\t\ttheta: %.2f\n", t,
                  values.X(), values.Y(), head.Radians());
    }
  }

  double getEndT() const { return times[times.size()-1]; }

  Rotation2d getCourse(double t) const {
    const auto dx = xSpline.deriv(1, t);
    const auto dy = ySpline.deriv(1, t);
    const auto course = Rotation2d(std::atan2(dy, dx));
    return course;
  }

  Rotation2d getHeading(double t) const {
    const auto rads = Rotation2d(cosSpline(t), sinSpline(t)).Radians();
    return Rotation2d(rads);
  }

  Translation2d getTranslation(double t) const {
    return Translation2d(xSpline(t), ySpline(t));
  }

  Pose2d getPoint(double t) const {
    return Pose2d{getTranslation(t), getHeading(t)};
  }

  std::vector<double> times;
  tk::spline sinSpline;
  tk::spline cosSpline;  
  tk::spline xSpline; 
  tk::spline ySpline;
};
}  // namespace trajopt
