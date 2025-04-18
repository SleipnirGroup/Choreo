// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <concepts>
#include <vector>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/util/trajopt_util.hpp"

namespace trajopt {

struct DifferentialSolution;

// TODO: Replace with std::vector.append_range() from C++23
template <typename T>
inline void append_range(std::vector<T>& base,
                         const std::vector<T>& new_items) {
  base.insert(base.end(), new_items.begin(), new_items.end());
}

template <typename Solution>
inline Solution generate_linear_initial_guess(
    const std::vector<std::vector<Pose2d>>& initial_guess_points,
    const std::vector<size_t> control_interval_counts) {
  size_t wpt_cnt = control_interval_counts.size() + 1;
  size_t samp_tot = get_index(control_interval_counts, wpt_cnt - 1, 0) + 1;

  Solution initial_guess;

  initial_guess.x.reserve(samp_tot);
  initial_guess.y.reserve(samp_tot);
  if constexpr (std::same_as<Solution, DifferentialSolution>) {
    initial_guess.heading.reserve(samp_tot);
  } else {
    initial_guess.thetacos.reserve(samp_tot);
    initial_guess.thetasin.reserve(samp_tot);
  }

  initial_guess.dt.reserve(samp_tot);

  initial_guess.x.push_back(initial_guess_points.front().front().x());
  initial_guess.y.push_back(initial_guess_points.front().front().y());
  if constexpr (std::same_as<Solution, DifferentialSolution>) {
    initial_guess.heading.push_back(
        initial_guess_points.front().front().rotation().radians());
  } else {
    initial_guess.thetacos.push_back(
        initial_guess_points.front().front().rotation().cos());
    initial_guess.thetasin.push_back(
        initial_guess_points.front().front().rotation().sin());
  }

  for (size_t i = 0; i < samp_tot; ++i) {
    initial_guess.dt.push_back((wpt_cnt * 5.0) / samp_tot);
  }

  for (size_t wpt_index = 1; wpt_index < wpt_cnt; ++wpt_index) {
    size_t N_sgmt = control_interval_counts.at(wpt_index - 1);
    size_t guess_point_count = initial_guess_points.at(wpt_index).size();
    size_t N_guess_sgmt = N_sgmt / guess_point_count;
    append_range(
        initial_guess.x,
        linspace(initial_guess_points.at(wpt_index - 1).back().x(),
                 initial_guess_points.at(wpt_index).front().x(), N_guess_sgmt));
    append_range(
        initial_guess.y,
        linspace(initial_guess_points.at(wpt_index - 1).back().y(),
                 initial_guess_points.at(wpt_index).front().y(), N_guess_sgmt));
    auto wpt_thetas = angle_linspace(
        initial_guess_points.at(wpt_index - 1).back().rotation().radians(),
        initial_guess_points.at(wpt_index).front().rotation().radians(),
        N_guess_sgmt);
    for (auto theta : wpt_thetas) {
      if constexpr (std::same_as<Solution, DifferentialSolution>) {
        initial_guess.heading.push_back(theta);
      } else {
        initial_guess.thetacos.push_back(std::cos(theta));
        initial_guess.thetasin.push_back(std::sin(theta));
      }
    }
    for (size_t guess_point_index = 1;
         guess_point_index < guess_point_count - 1;
         ++guess_point_index) {  // if three or more guess points
      append_range(
          initial_guess.x,
          linspace(
              initial_guess_points.at(wpt_index).at(guess_point_index - 1).x(),
              initial_guess_points.at(wpt_index).at(guess_point_index).x(),
              N_guess_sgmt));
      append_range(
          initial_guess.y,
          linspace(
              initial_guess_points.at(wpt_index).at(guess_point_index - 1).y(),
              initial_guess_points.at(wpt_index).at(guess_point_index).y(),
              N_guess_sgmt));
      auto guess_thetas = angle_linspace(initial_guess_points.at(wpt_index)
                                             .at(guess_point_index - 1)
                                             .rotation()
                                             .radians(),
                                         initial_guess_points.at(wpt_index)
                                             .at(guess_point_index)
                                             .rotation()
                                             .radians(),
                                         N_guess_sgmt);
      for (auto theta : guess_thetas) {
        if constexpr (std::same_as<Solution, DifferentialSolution>) {
          initial_guess.heading.push_back(theta);
        } else {
          initial_guess.thetacos.push_back(std::cos(theta));
          initial_guess.thetasin.push_back(std::sin(theta));
        }
      }
    }
    if (guess_point_count > 1) {  // if two or more guess points
      size_t N_last_guess_sgmt =
          N_sgmt - (guess_point_count - 1) * N_guess_sgmt;
      append_range(
          initial_guess.x,
          linspace(
              initial_guess_points.at(wpt_index).at(guess_point_count - 2).x(),
              initial_guess_points.at(wpt_index).back().x(),
              N_last_guess_sgmt));
      append_range(
          initial_guess.y,
          linspace(
              initial_guess_points.at(wpt_index).at(guess_point_count - 2).y(),
              initial_guess_points.at(wpt_index).back().y(),
              N_last_guess_sgmt));
      auto last_thetas = angle_linspace(
          initial_guess_points.at(wpt_index)
              .at(guess_point_count - 2)
              .rotation()
              .radians(),
          initial_guess_points.at(wpt_index).back().rotation().radians(),
          N_last_guess_sgmt);
      for (auto theta : last_thetas) {
        if constexpr (std::same_as<Solution, DifferentialSolution>) {
          initial_guess.heading.push_back(theta);
        } else {
          initial_guess.thetacos.push_back(std::cos(theta));
          initial_guess.thetasin.push_back(std::sin(theta));
        }
      }
    }
  }

  return initial_guess;
}

}  // namespace trajopt
