// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <numbers>
#include <numeric>
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
  return std::accumulate(N.begin(), N.begin() + wptIndex, size_t{0}) +
         sampleIndex;
}

/**
 * Returns a vector of linearly spaced elements between start exclusive and end
 * inclusive.
 *
 * @param start The initial value exclusive.
 * @param end The final value exclusive.
 * @param numSamples The number of samples in the vector.
 * @return A vector of linearly spaced elements between start exclusive and end
 *     inclusive.
 */
inline std::vector<double> Linspace(double start, double end,
                                    size_t numSamples) {
  std::vector<double> result;
  double delta = (end - start) / numSamples;
  for (size_t i = 1; i <= numSamples; ++i) {
    result.push_back(start + i * delta);
  }
  return result;
}

/**
 * Returns modulus of input.
 *
 * @param input        Input value to wrap.
 * @param minimumInput The minimum value expected from the input.
 * @param maximumInput The maximum value expected from the input.
 */
constexpr double InputModulus(double input, double max, double min) {
  double modulus = max - min;

  // Wrap input if it's above the maximum input
  int numMax = (input - min) / modulus;
  input -= numMax * modulus;

  // Wrap input if it's below the minimum input
  int numMin = (input - max) / modulus;
  input -= numMin * modulus;

  return input;
}

/**
 * Wraps an angle to the range -π to π radians (-180 to 180 degrees).
 *
 * @param angle Angle to wrap in radians.
 */
constexpr double AngleModulus(double angle) {
  return InputModulus(angle, std::numbers::pi, -std::numbers::pi);
}

/**
 * Returns a vector of linearly spaced angles between start exclusive and end
 * inclusive.
 *
 * @param start The initial value exclusive.
 * @param end The final value exclusive.
 * @param numSamples The number of samples in the vector.
 * @return A vector of linearly spaced elements between start exclusive and end
 *     inclusive.
 */
inline std::vector<double> AngleLinspace(double start, double end,
                                         size_t numSamples) {
  return Linspace(start, start + AngleModulus(end - start), numSamples);
}

/**
 * Returns the time a trapezoid profile takes to travel a given distance from
 * rest to rest.
 *
 * @param distance The distance to travel.
 * @param velocity The profile's maximum velocity.
 * @param acceleration The profile's maximum acceleration.
 */
inline double CalculateTrapezoidalTime(double distance, double velocity,
                                       double acceleration) {
  if (distance > ((velocity * velocity) / acceleration)) {
    // Velocity profile is shaped like a trapezoid
    return distance / velocity + velocity / acceleration;
  } else {
    // Velocity profile is shaped like a triangle
    return 2.0 * std::sqrt(distance * acceleration) / acceleration;
  }
}

}  // namespace trajopt
