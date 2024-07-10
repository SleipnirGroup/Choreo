// Copyright (c) TrajoptLib contributors

#pragma once

#include <sleipnir/autodiff/Variable.hpp>

#include "trajopt/geometry/Translation2.hpp"

namespace trajopt::detail {

// https://www.desmos.com/calculator/cqmc1tjtsv
template <typename T, typename U>
decltype(auto) LinePointDistance(const Translation2<T>& lineStart,
                                 const Translation2<T>& lineEnd,
                                 const Translation2<U>& point) {
  using R = decltype(std::declval<T>() + std::declval<U>());

  auto max = [](R a, R b) {
    return +0.5 * (1 + sleipnir::sign(b - a)) * (b - a) + a;
  };
  auto min = [](R a, R b) {
    return -0.5 * (1 + sleipnir::sign(b - a)) * (b - a) + b;
  };
  auto Lerp = [](R a, R b, R t) { return a + t * (b - a); };

  Translation2<R> l{lineEnd.X() - lineStart.X(), lineEnd.Y() - lineStart.Y()};
  Translation2<R> v{point.X() - lineStart.X(), point.Y() - lineStart.Y()};

  auto t = v.Dot(l) / l.SquaredNorm();
  auto tBounded = max(min(t, 1), 0);  // NOLINT

  Translation2<R> i{Lerp(lineStart.X(), lineEnd.X(), tBounded),
                    Lerp(lineStart.Y(), lineEnd.Y(), tBounded)};
  return (i - point).SquaredNorm();
}

}  // namespace trajopt::detail
