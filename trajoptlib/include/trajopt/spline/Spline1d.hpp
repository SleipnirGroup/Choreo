// Copyright (c) TrajoptLib contributors

#pragma once

#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * 1D spline.
 */
class TRAJOPT_DLLEXPORT Spline1d {
 public:
  virtual ~Spline1d() = default;

  /**
   * Return the position at point t.
   *
   * @param t The point t
   * @return The position at point t.
   */
  virtual double GetPosition(double t) const = 0;

  /**
   * Return the velocity at point t.
   *
   * @param t The point t
   * @return The velocity at point t.
   */
  virtual double GetVelocity(double t) const = 0;

  /**
   * Return the acceleration at point t.
   *
   * @param t The point t
   * @return The acceleration at point t.
   */
  virtual double GetAcceleration(double t) const = 0;

  /**
   * Return the jerk at point t.
   *
   * @param t The point t
   * @return The jerk at point t.
   */
  virtual double GetJerk(double t) const = 0;
};

}  // namespace trajopt
