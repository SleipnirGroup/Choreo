// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <concepts>
#include <utility>
#include <vector>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/rotation2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/spline/cubic_hermite_pose_spline_holonomic.hpp"
#include "trajopt/spline/cubic_hermite_spline.hpp"
#include "trajopt/spline/spline_helper.hpp"
#include "trajopt/util/trajopt_util.hpp"

namespace trajopt {

struct DifferentialSolution;

using PoseWithCurvature = std::pair<Pose2d, double>;

template <typename Solution>
inline std::vector<CubicHermitePoseSplineHolonomic> splines_from_waypoints(
    const std::vector<std::vector<Pose2d>> initial_guess_points) {
  size_t total_guess_points = 0;
  for (const auto& points : initial_guess_points) {
    total_guess_points += points.size();
  }
  std::vector<Translation2d> flat_translation_points;
  std::vector<Rotation2d> flat_headings;
  flat_translation_points.reserve(total_guess_points);
  flat_headings.reserve(total_guess_points);

  // populate translation and heading vectors
  for (const auto& guess_points : initial_guess_points) {
    for (const auto& guess_point : guess_points) {
      flat_translation_points.emplace_back(guess_point.translation().x(),
                                           guess_point.translation().y());
      flat_headings.emplace_back(guess_point.rotation().cos(),
                                 guess_point.rotation().sin());
    }
  }

  std::vector<CubicHermiteSpline> splines_temp;
  splines_temp.reserve(total_guess_points);

  if constexpr (std::same_as<Solution, DifferentialSolution>) {
    for (size_t i = 1; i < flat_translation_points.size(); ++i) {
      const auto spline_control_vectors =
          SplineHelper::cubic_control_vectors_from_waypoints(
              Pose2d{flat_translation_points.at(i - 1),
                     flat_headings.at(i - 1)},
              {}, Pose2d{flat_translation_points.at(i), flat_headings.at(i)});
      const auto s = SplineHelper::cubic_splines_from_control_vectors(
          spline_control_vectors.front(), {}, spline_control_vectors.back());
      for (const auto& _s : s) {
        splines_temp.push_back(_s);
      }
    }
  } else {
    // calculate angles and pose for start and end of path spline
    const auto start_spline_angle =
        (flat_translation_points.at(1) - flat_translation_points.at(0)).angle();
    const auto end_spline_angle =
        (flat_translation_points.back() -
         flat_translation_points.at(flat_translation_points.size() - 2))
            .angle();
    const Pose2d start{flat_translation_points.front(), start_spline_angle};
    const Pose2d end{flat_translation_points.back(), end_spline_angle};

    // use all interior points to create the path spline
    std::vector<Translation2d> interior_points{
        flat_translation_points.begin() + 1, flat_translation_points.end() - 1};

    const auto spline_control_vectors =
        SplineHelper::cubic_control_vectors_from_waypoints(
            start, interior_points, end);
    const auto s = SplineHelper::cubic_splines_from_control_vectors(
        spline_control_vectors.front(), interior_points,
        spline_control_vectors.back());
    for (const auto& _s : s) {
      splines_temp.push_back(_s);
    }
  }

  std::vector<CubicHermitePoseSplineHolonomic> splines;
  splines.reserve(splines_temp.size());
  for (size_t i = 1; i <= splines_temp.size(); ++i) {
    splines.emplace_back(splines_temp.at(i - 1).get_initial_control_vector().x,
                         splines_temp.at(i - 1).get_final_control_vector().x,
                         splines_temp.at(i - 1).get_initial_control_vector().y,
                         splines_temp.at(i - 1).get_final_control_vector().y,
                         flat_headings.at(i - 1), flat_headings.at(i));
  }
  return splines;
}

template <typename Solution>
inline Solution generate_spline_initial_guess(
    const std::vector<std::vector<Pose2d>>& initial_guess_points,
    const std::vector<size_t> control_interval_counts) {
  std::vector<CubicHermitePoseSplineHolonomic> splines =
      splines_from_waypoints<Solution>(initial_guess_points);
  std::vector<std::vector<PoseWithCurvature>> sgmt_points;
  for (size_t i = 0; i < initial_guess_points.size(); ++i) {
    for ([[maybe_unused]]
         size_t j = 0;
         j < initial_guess_points.at(i).size(); ++j) {
      sgmt_points.push_back(std::vector<PoseWithCurvature>());
    }
  }

  size_t traj_idx = 0;
  if constexpr (std::same_as<Solution, DifferentialSolution>) {
    sgmt_points.at(0).push_back(
        splines.at(traj_idx).get_point(0, true).value());
  } else {
    sgmt_points.at(0).push_back(
        splines.at(traj_idx).get_point(0, false).value());
  }
  for (size_t sgmt_idx = 1; sgmt_idx < initial_guess_points.size();
       ++sgmt_idx) {
    auto guess_points_size = initial_guess_points.at(sgmt_idx).size();
    auto samples_for_sgmt = control_interval_counts.at(sgmt_idx - 1);
    size_t samples = samples_for_sgmt / guess_points_size;
    for (size_t guessIdx = 0; guessIdx < guess_points_size; ++guessIdx) {
      if (guessIdx == (guess_points_size - 1)) {
        samples += (samples_for_sgmt % guess_points_size);
      }
      for (size_t sample_idx = 1; sample_idx < samples + 1; ++sample_idx) {
        auto t = static_cast<double>(sample_idx) / samples;

        if constexpr (std::same_as<Solution, DifferentialSolution>) {
          const auto state = splines.at(traj_idx).get_point(t, true).value();
          sgmt_points.at(traj_idx + 1).push_back(state);
        } else {
          const auto state = splines.at(traj_idx).get_point(t, false).value();
          sgmt_points.at(traj_idx + 1).push_back(state);
        }
      }
      ++traj_idx;
    }
  }

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
  for (size_t i = 0; i < samp_tot; ++i) {
    initial_guess.dt.push_back((wpt_cnt * 5.0) / samp_tot);
  }

  for (auto sgmt : sgmt_points) {
    for (auto pt : sgmt) {
      initial_guess.x.push_back(pt.first.x());
      initial_guess.y.push_back(pt.first.y());
      if constexpr (std::same_as<Solution, DifferentialSolution>) {
        initial_guess.heading.push_back(pt.first.rotation().radians());
      } else {
        initial_guess.thetacos.push_back(pt.first.rotation().cos());
        initial_guess.thetasin.push_back(pt.first.rotation().sin());
      }
    }
  }
  return initial_guess;
}

}  // namespace trajopt
