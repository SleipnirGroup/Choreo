// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>

#include "trajopt/spline/Spline1d.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

class TRAJOPT_DLLEXPORT CubicHermiteSpline1d : public Spline1d {
 public:
  // Coefficients of the cubic polynomial
  const double a, b, c, d;

  CubicHermiteSpline1d(double p0, double p1, double v0, double v1)
      : a(v0 + v1 + 2 * p0 - 2 * p1),
        b(-2 * v0 - v1 - 3 * p0 + 3 * p1),
        c(v0),
        d(p0) {}

  double getPosition(double t) const override {
    return a * std::pow(t, 3) + b * std::pow(t, 2) + c * t + d;
  }

  double getVelocity(double t) const override {
    return 3 * a * std::pow(t, 2) + 2 * b * t + c;
  }

  double getAcceleration(double t) const override { return 6 * a * t + 2 * b; }

  double getJerk([[maybe_unused]] double t) const override { return 6 * a; }
};

}  // namespace trajopt
