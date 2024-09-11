// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>
#include <iostream>

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

  explicit PoseSplineHolonomic(std::vector<Pose2d> waypoints) {
    const int DEGREE = std::min(waypoints.size() - 1, static_cast<unsigned long long>(3));
    std::vector<Rotation2d> headings;
    headings.reserve(waypoints.size());
    for (const auto w : waypoints) {
      headings.push_back(w.Rotation());
    }
    
    size_t num_wpts = waypoints.size();
    times.resize(num_wpts + 1);
    printf("creating pose spline with %zd wpts\n", num_wpts);
    printf("times [ ");
    for (size_t i = 0; i < num_wpts; ++i) {
      times(i) = static_cast<double>(i);
      printf("%f, ", times(i));
    }
    times(num_wpts) = times(num_wpts - 1);
    printf("%f] %d\n", times(num_wpts), !!(times(num_wpts) > 0.0));

    printf("   xy [ ");
    Eigen::MatrixXd xy(2, num_wpts + 1);
    for (size_t i = 0; i < num_wpts; ++i) {
      auto w = waypoints[i];
      xy.col(i) << w.X(), w.Y();
      printf("[%.2f, %.2f], ", xy.col(i)[0], xy.col(i)[1]);
    }
    xy.col(num_wpts) = xy.col(num_wpts - 1);
    printf("[%.2f, %.2f] ] \n", xy.col(num_wpts)[0], xy.col(num_wpts)[1]);
    translationSpline = Eigen::SplineFitting<Eigen::Spline2d>::Interpolate(xy, DEGREE, times);
    std::cout << "\n**** transSpline:\n " << translationSpline.ctrls() << std::endl;
    
    for (double t = 0; t <= times(num_wpts); t += 0.25) {
      auto values = translationSpline(t);
      std::printf("time: %f \txy: %.2f,\t%.2f\n", t, values[0], values[1]);    
    }


    printf("theta [ ");
    Eigen::RowVectorXd theta(headings.size() + 1);
    for (size_t i = 0; i < headings.size(); ++i) {
      theta(i) = headings[i].Radians();
      printf("%.2f, ", theta(i));
    }
    theta(num_wpts) = headings.back().Radians();
    thetaSpline = SplineFitting1D::Interpolate(theta, DEGREE, times);
    printf("%.2f ]\n", theta(num_wpts));
  }
  

  double getEndT() const { return times(times.SizeMinusOne); }

  Rotation2d getCourse(double t) const {
    const auto dxdy = translationSpline.derivatives(t, 1);
    const auto course = Rotation2d(std::atan2(dxdy(1), dxdy(0)));
    return course;
  }

  Rotation2d getHeading(double t) const {
    const auto heading = thetaSpline(t);
    std::cout << "heading: " << heading << std::endl;
    return Rotation2d(heading(0));
  }

  Pose2d getPoint(double t) const {
    auto xy = translationSpline(t);
    std::cout << "getPoint(" << t << "): " << xy << std::endl;
    auto h = getHeading(t);
    return Pose2d{xy[0], xy[1], h};
  }

  Eigen::RowVectorXd times;
  Eigen::Spline<double, 1> thetaSpline;
  Eigen::Spline2d translationSpline;
};
}  // namespace trajopt
