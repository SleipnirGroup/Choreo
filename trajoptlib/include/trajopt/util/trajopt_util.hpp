// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <numbers>
#include <numeric>
#include <vector>

namespace trajopt {

/// Get the index of an item in a decision variable array, given the waypoint
/// and sample indices and whether this array includes an entry for the initial
/// sample point ("dt" does not, "x" does).
///
/// @param N The control interval counts of each segment, in order.
/// @param wpt_index The waypoint index, 0 indexed.
/// @param sample_index The sample index within the segment, 0 indexed.
/// @return The index in the array.
inline size_t get_index(const std::vector<size_t>& N, size_t wpt_index,
                        size_t sample_index = 0) {
  return std::accumulate(N.begin(), N.begin() + wpt_index, size_t{0}) +
         sample_index;
}

/// Returns a vector of linearly spaced elements between start exclusive and end
/// inclusive.
///
/// @param start The initial value exclusive.
/// @param end The final value exclusive.
/// @param num_samples The number of samples in the vector.
/// @return A vector of linearly spaced elements between start exclusive and end
///     inclusive.
inline std::vector<double> linspace(double start, double end,
                                    size_t num_samples) {
  std::vector<double> result;
  double delta = (end - start) / num_samples;
  for (size_t i = 1; i <= num_samples; ++i) {
    result.push_back(start + i * delta);
  }
  return result;
}

/// Returns modulus of input.
///
/// @param input Input value to wrap.
/// @param minimum_input The minimum value expected from the input.
/// @param maximum_input The maximum value expected from the input.
constexpr double input_modulus(double input, double minimum_input,
                               double maximum_input) {
  double modulus = maximum_input - minimum_input;

  // Wrap input if it's above the maximum input
  int numMax = (input - minimum_input) / modulus;
  input -= numMax * modulus;

  // Wrap input if it's below the minimum input
  int numMin = (input - maximum_input) / modulus;
  input -= numMin * modulus;

  return input;
}

/// Wraps an angle to the range -π to π radians (-180 to 180 degrees).
///
/// @param angle Angle to wrap in radians.
constexpr double angle_modulus(double angle) {
  return input_modulus(angle, -std::numbers::pi, std::numbers::pi);
}

/// Returns a vector of linearly spaced angles between start exclusive and end
/// inclusive.
///
/// @param start The initial value exclusive.
/// @param end The final value exclusive.
/// @param num_samples The number of samples in the vector.
/// @return A vector of linearly spaced elements between start exclusive and end
///     inclusive.
inline std::vector<double> angle_linspace(double start, double end,
                                          size_t num_samples) {
  return linspace(start, start + angle_modulus(end - start), num_samples);
}

/// Returns the time a trapezoid profile takes to travel a given distance from
/// rest to rest.
///
/// @param distance The distance to travel.
/// @param velocity The profile's maximum velocity.
/// @param acceleration The profile's maximum acceleration.
inline double calculate_trapezoidal_time(double distance, double velocity,
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
