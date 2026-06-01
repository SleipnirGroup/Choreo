// Copyright (c) Choreo contributors

#pragma once
#include <vector>

#include <choreo/constraint_data/constraint_data.hpp>
#include <choreo/parameters.hpp>
#include <trajopt/geometry/pose2.hpp>
#include <trajopt/path/path_builder.hpp>
#include <wpi/units/time.hpp>

#include "segment.hpp"
namespace choreo {
std::vector<Segment> convert_to_segments(const Parameters& params);

template <typename Drivetrain, typename Solution>
void apply_segments(const std::vector<choreo::Segment>& segments,
                    trajopt::PathBuilder<Drivetrain, Solution>& generator,
                    const wpi::units::second_t target_dt) {
  size_t wpt_cnt = 0;
  std::vector<trajopt::Pose2d> guess_points_after_waypoint;
  std::vector<size_t> intervals(segments.size(), 0);

  for (int i = 0; i < segments.size(); i++) {
    const auto& segment = segments[i];
    std::println(
        "Applying segment starting at waypoint ({}, {}) with heading {} and {} "
        "segment constraints and {} waypoint constraints",
        segment.start.x.val.value(), segment.start.y.val.value(),
        segment.start.heading.val.value(), segment.segment_constraints.size(),
        segment.waypoint_constraints.size());
    if (segment.coalesce_with_previous) {
      std::println(
          "This segment is marked to be coalesced with the previous segment.");
      guess_points_after_waypoint.push_back(segment.start.toTrajoptPose2d());
      intervals.back() += segment.interval_count(target_dt).value_or(0);
    } else {
      if (wpt_cnt > 0) {
        generator.sgmt_initial_guess_points(wpt_cnt - 1,
                                            guess_points_after_waypoint);
      }
      guess_points_after_waypoint.clear();
      const auto wpt = segment.start;
      if (wpt.fix_heading && wpt.fix_translation) {
        generator.pose_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
      } else if (wpt.fix_translation) {
        generator.translation_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
      } else {
        generator.empty_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
      }
      if (i != segments.size() - 1) {
        intervals.push_back(segment.interval_count(target_dt).value_or(0));
      }
      for (const auto& constraint : segment.segment_constraints) {
        generator.sgmt_constraint(wpt_cnt, wpt_cnt + 1, constraint);
      }
    }
  }
}
}  // namespace choreo
