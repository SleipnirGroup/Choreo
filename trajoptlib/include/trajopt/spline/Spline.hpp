// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include <Eigen/Core>
#include <unsupported/Eigen/Splines>

#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

static int test() {
  std::vector<Eigen::Vector2d> pts;
  pts.push_back(Eigen::Vector2d(0, 0));
  pts.push_back(Eigen::Vector2d(1, 0));
  pts.push_back(Eigen::Vector2d(2, 1));
  pts.push_back(Eigen::Vector2d(2, 2));
  pts.push_back(Eigen::Vector2d(2, 2));
  Eigen::RowVectorXd times(5);
  times << 0, 1, 2, 3, 3;

  Eigen::MatrixXd points(2, pts.size());
  for (auto i = 0; i < pts.size(); ++i) {
    const auto p = pts[i];
    points.col(i) << p[0], p[1];
  }
  Eigen::Spline2d spline =
      Eigen::SplineFitting<Eigen::Spline2d>::Interpolate(points, 3, times);
  for (double t = 0; t <= times[times.size() - 1]; t += 0.5) {
    auto values = spline(t);
    std::printf("time: %f \txy: %f,\t%f\n", t, values[0], values[1]);
  }
  return 0;
}

class TRAJOPT_DLLEXPORT Spline {
 public:
 protected:
  Eigen::Spline2d xySpline;
  Eigen::Spline<double, 1> heading;
};
}  // namespace trajopt
