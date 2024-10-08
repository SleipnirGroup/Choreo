// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <numbers>
#include <vector>

namespace trajopt {

/**
 * Get the index of an item in a decision variable array, given the waypoint and
 * sample indices and whether this array includes an entry for the initial
 * sample point ("dt" does not, "x" does).
 *
 * @param N The control interval counts of each segment, in order.
 * @param wptIndex The waypoint index, 0 indexed.
 * @param sampleIndex The sample index within the segment, 0 indexed.
 * @return The index in the array.
 */
inline size_t GetIndex(const std::vector<size_t>& N, size_t wptIndex,
                       size_t sampleIndex = 0) {
  size_t index = 0;

  for (size_t _wptIndex = 0; _wptIndex < wptIndex; ++_wptIndex) {
    index += N.at(_wptIndex);
  }
  index += sampleIndex;
  return index;
}

inline std::vector<double> Linspace(double startValue, double endValue,
                                    size_t numSamples) {
  std::vector<double> result;
  double delta = (endValue - startValue) / numSamples;
  for (size_t index = 1; index <= numSamples; ++index) {
    result.push_back(startValue + index * delta);
  }
  return result;
}

inline double InputModulus(double input, double max, double min) {
  const double modulus = max - min;

  // Wrap input if it's above the maximum input
  const double numMax = std::trunc((input - min) / modulus);
  input -= numMax * modulus;

  // Wrap input if it's below the minimum input
  const double numMin = std::trunc((input - max) / modulus);
  input -= numMin * modulus;

  return input;
}

inline double AngleModulus(double radians) {
  return InputModulus(radians, std::numbers::pi, -std::numbers::pi);
}

inline std::vector<double> AngleLinspace(double startValue, double endValue,
                                         size_t numSamples) {
  auto diff = endValue - startValue;

  // angleModulus
  diff = AngleModulus(diff);

  return Linspace(startValue, startValue + diff, numSamples);
}

inline double CalculateTrapezoidalTime(double distance, double velocity,
                                       double acceleration) {
  if (distance > ((velocity * velocity) / acceleration)) {
    // trapezoid
    return distance / velocity + velocity / acceleration;
  } else {
    // triangle
    return 2.0 * (std::sqrt(distance * acceleration) / acceleration);
  }
}

}  // namespace trajopt
