// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include <Eigen/Core>
#include <unsupported/Eigen/Splines>

namespace trajopt {

static int test() {
  std::vector<Eigen::Vector2d> pts;
  pts.push_back(Eigen::Vector2d(0, 0));
  pts.push_back(Eigen::Vector2d(0.5, 0));
  pts.push_back(Eigen::Vector2d(1, 0.25));
  pts.push_back(Eigen::Vector2d(2, 1));
  pts.push_back(Eigen::Vector2d(2, 2));
  pts.push_back(Eigen::Vector2d(2, 2));

  Eigen::RowVectorXd times(pts.size());
  for (size_t i = 0; i < pts.size(); ++i) {
    times.row(0)[i] = i;
  }
  times.row(0)[times.row(0).size() - 1] = times.row(0)[times.row(0).size() - 2];

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
}  // namespace trajopt
