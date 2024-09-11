// Copyright (c) TrajoptLib contributors

#pragma once

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
  // using PoseWithCurvature = std::pair<Pose2d, double>; // <pose [meter],
  // curvature [rad/meter]>

  // waypoints.size() == headings.size()
  PoseSplineHolonomic(std::vector<Pose2d> waypoints,
                      std::vector<Rotation2d> headings) {
    size_t num_wpts = waypoints.size();
    times.resize(num_wpts + 1);
    for (size_t i = 0; i < num_wpts; ++i) {
      times(i) = i;
    }
    times(num_wpts) = times(num_wpts - 1);

    Eigen::MatrixXd xy(2, num_wpts + 1);
    for (size_t i = 0; i < num_wpts; ++i) {
      auto w = waypoints[i];
      xy.col(i) << w.X(), w.Y();
    }
    xy.col(num_wpts) = xy.col(num_wpts - 1);
    translationSpline = SplineFitting2D::Interpolate(xy, 3, times);

    Eigen::RowVectorXd theta(headings.size() + 1);
    for (size_t i = 0; i < headings.size(); ++i) {
      theta(i) = headings[i].Radians();
    }
    theta(num_wpts) = headings.back().Radians();
    thetaSpline = SplineFitting1D::Interpolate(theta, 3, times);
  }

  explicit PoseSplineHolonomic(std::vector<Pose2d> waypoints) {
    std::vector<Rotation2d> headings(waypoints.size());
    for (const auto w : waypoints) {
      headings.push_back(w.Rotation());
    }
    PoseSplineHolonomic(waypoints, headings);
  }

  double getEndT() const { return times(times.SizeMinusOne); }

  Rotation2d getCourse(double t) const {
    const auto dxdy = translationSpline.derivatives(t, 1);
    const auto course = Rotation2d(std::atan2(dxdy(1), dxdy(0)));
    return course;
  }

  Rotation2d getHeading(double t) const {
    const auto heading = thetaSpline(t);
    return Rotation2d(heading(0));
  }

  Pose2d getPoint(double t) const {
    auto xy = translationSpline(t);
    auto h = getHeading(t);
    return Pose2d{xy(0), xy(1), h};
  }

 private:
  Eigen::RowVectorXd times;
  Eigen::Spline<double, 1> thetaSpline;
  Eigen::Spline2d translationSpline;
};
}  // namespace trajopt
