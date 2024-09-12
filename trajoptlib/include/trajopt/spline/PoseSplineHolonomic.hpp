// Copyright (c) TrajoptLib contributors

#pragma once

#include <algorithm>
#include <iostream>
#include <vector>

#include <Eigen/Core>
#include <unsupported/Eigen/Splines>

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
    const size_t DEGREE =
        std::min(waypoints.size() - 1, static_cast<size_t>(3));
    std::vector<Rotation2d> headings;

    headings.reserve(waypoints.size());
    for (const auto w : waypoints) {
      headings.push_back(w.Rotation());
    }

    size_t num_wpts = waypoints.size();
    times.resize(num_wpts + 1);
    for (size_t i = 0; i < num_wpts; ++i) {
      times(i) = static_cast<double>(i);
    }
    times(num_wpts) = times(num_wpts - 1);

    Eigen::MatrixXd xy(2, num_wpts + 1);
    for (size_t i = 0; i < num_wpts; ++i) {
      auto w = waypoints[i];
      xy.col(i) << w.X(), w.Y();
    }
    xy.col(num_wpts) = xy.col(num_wpts - 1);
    translationSpline =
        Eigen::SplineFitting<Eigen::Spline2d>::Interpolate(xy, DEGREE, times);

    Eigen::RowVectorXd sins(headings.size() + 1);
    Eigen::RowVectorXd coss(headings.size() + 1);
    for (size_t i = 0; i < headings.size(); ++i) {
      sins(i) = headings[i].Sin();
      coss(i) = headings[i].Cos();
    }
    sins(num_wpts) = headings.back().Sin();
    coss(num_wpts) = headings.back().Cos();
    sin = SplineFitting1D::Interpolate(sins, DEGREE, times);
    cos = SplineFitting1D::Interpolate(coss, DEGREE, times);

    for (double t = 0; t <= times(num_wpts); t += 0.25) {
      auto values = translationSpline(t);
      auto head = getHeading(t);
      std::printf("time: %.2f \tx: %.2f\t\ty: %.2f\t\ttheta: %.2f\n", t,
                  values[0], values[1], head.Radians());
    }
  }

  double getEndT() const { return times(times.SizeMinusOne); }

  Rotation2d getCourse(double t) const {
    const auto dxdy = translationSpline.derivatives(t, 1);
    const auto course = Rotation2d(std::atan2(dxdy(1), dxdy(0)));
    return course;
  }

  Rotation2d getHeading(double t) const {
    const auto rads = Rotation2d(std::cos(t)(0), std::sin(t)(0)).Radians();
    return Rotation2d(rads);
  }

  Pose2d getPoint(double t) const {
    auto xy = translationSpline(t);
    auto h = getHeading(t);
    return Pose2d{xy[0], xy[1], h};
  }

  Eigen::RowVectorXd times;
  Eigen::Spline<double, 1> sin;
  Eigen::Spline<double, 1> cos;
  Eigen::Spline2d translationSpline;
};
}  // namespace trajopt
