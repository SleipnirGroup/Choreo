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
 * @param wptIndex The waypoint index (1 + segment index).
 * @param sampIndex The sample index within the segment.
 * @return The index in the array.
 */
inline size_t GetIndex(const std::vector<size_t>& N, size_t wptIndex,
                       size_t sampIndex = 0) {
  size_t index = 0;
  if (wptIndex > 0) {
    ++index;
  }
  for (size_t _wptIndex = 1; _wptIndex < wptIndex; ++_wptIndex) {
    index += N.at(_wptIndex - 1);
  }
  index += sampIndex;
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

inline std::vector<double> AngleLinspace(double startValue, double endValue,
                                         size_t numSamples) {
  auto diff = endValue - startValue;
  // angleModulus
  const double modulus = 2 * std::numbers::pi;
  const double minimumInput = -std::numbers::pi;
  const double maximumInput = std::numbers::pi;
  // Wrap input if it's above the maximum input
  const double numMax = std::trunc((diff - minimumInput) / modulus);
  diff -= numMax * modulus;

  // Wrap input if it's below the minimum input
  const double numMin = std::trunc((diff - maximumInput) / modulus);
  diff -= numMin * modulus;

  return Linspace(startValue, startValue + diff, numSamples);
}

}  // namespace trajopt
