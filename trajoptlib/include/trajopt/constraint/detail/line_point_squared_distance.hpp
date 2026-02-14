// Copyright (c) TrajoptLib contributors

#pragma once

#include <sleipnir/autodiff/variable.hpp>

#include "trajopt/geometry/translation2.hpp"

namespace trajopt::detail {

// https://www.desmos.com/calculator/cqmc1tjtsv
template <typename T, typename U>
decltype(auto) line_point_squared_distance(const Translation2<T>& line_start,
                                           const Translation2<T>& line_end,
                                           const Translation2<U>& point) {
  using R = decltype(std::declval<T>() + std::declval<U>());

  auto lerp = [](R a, R b, R t) { return a + t * (b - a); };

  Translation2<R> l{line_end.x() - line_start.x(),
                    line_end.y() - line_start.y()};
  Translation2<R> v{point.x() - line_start.x(), point.y() - line_start.y()};

  auto t = v.dot(l) / l.squared_norm();
  auto t_bounded = slp::max(slp::min(t, 1), 0);

  Translation2<R> i{lerp(line_start.x(), line_end.x(), t_bounded),
                    lerp(line_start.y(), line_end.y(), t_bounded)};
  return (i - point).squared_norm();
}

}  // namespace trajopt::detail
