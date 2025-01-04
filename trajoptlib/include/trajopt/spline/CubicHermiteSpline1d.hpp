// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>

#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * 1D cubic hermite spline.
 */
class TRAJOPT_DLLEXPORT CubicHermiteSpline1d {
 public:
  /**
   * Constructs a 1D cubic hermite spline.
   *
   * @param p0 The initial position.
   * @param p1 The final position.
   * @param v0 The initial velocity.
   * @param v1 The final velocity.
   */
  CubicHermiteSpline1d(double p0, double p1, double v0, double v1)
      : a(v0 + v1 + 2 * p0 - 2 * p1),
        b(-2 * v0 - v1 - 3 * p0 + 3 * p1),
        c(v0),
        d(p0) {}

  /**
   * Return the position at point t.
   *
   * @param t The point t
   * @return The position at point t.
   */
  double GetPosition(double t) const {
    return a * std::pow(t, 3) + b * std::pow(t, 2) + c * t + d;
  }

  /**
   * Return the velocity at point t.
   *
   * @param t The point t
   * @return The velocity at point t.
   */
  double GetVelocity(double t) const {
    return 3 * a * std::pow(t, 2) + 2 * b * t + c;
  }

  /**
   * Return the acceleration at point t.
   *
   * @param t The point t
   * @return The acceleration at point t.
   */
  double GetAcceleration(double t) const { return 6 * a * t + 2 * b; }

  /**
   * Return the jerk at point t.
   *
   * @param t The point t
   * @return The jerk at point t.
   */
  double GetJerk([[maybe_unused]] double t) const { return 6 * a; }

 private:
  // Coefficients of the cubic polynomial
  double a;
  double b;
  double c;
  double d;
};

}  // namespace trajopt
