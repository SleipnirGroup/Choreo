// Copyright (c) Choreo contributors

#include "split_to_segments.hpp"

#include <numbers>
#include <print>
#include <ranges>
#include <string>
#include <vector>

#include <choreo/constraint.hpp>
#include <choreo/constraint_data/constraint_data.hpp>
#include <choreo/expr.hpp>
#include <choreo/parameters.hpp>
#include <choreo/robot_config.hpp>
#include <choreo/trajectory/swerve_sample.hpp>
#include <choreo/waypoint.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#include <wpi/math/geometry/Pose2d.hpp>
#include <wpi/util/json.hpp>

#include "segment.hpp"
namespace choreo {
/// @brief Converts the waypoints and constraints in the Parameters into a vector of Segments, where each segment contains the constraints that apply to it. This is done by first validating and processing the constraints to determine which waypoints they apply to, then creating segments for each waypoint and assigning the appropriate constraints to each segment.
/// If a Segment's start Waypoint is marked as an initial guess (i.e. it is not the start or end of the path, is not referenced by any constraints, and does not have its translation or heading fixed), then it will be marked to coalesce with the previous segment, which means that it will be treated as part of the previous segment in the optimization problem instead of as a separate segment with its own constraints. This allows for waypoints that are only meant to provide an initial guess for the optimizer to be included in the path without forcing them to be treated as hard constraints.
 /// @param params The Parameters containing the waypoints and constraints to convert into segments.
 /// @return A vector of Segments, where each Segment contains a start Waypoint and the constraints that apply to it.

std::vector<Segment> convert_to_segments(const Parameters& params) {
  std::vector<ConstraintIDX> constraints;
  // First, we need to convert the constraints from the parameters into a more convenient format for processing. We also need to validate that the 'from' and 'to' indices are within bounds of the waypoints vector, and print warnings for any malformed constraints.
  // This filters out constraints with invalid indices.
  for (const auto& constraint : params.constraints) {
    if (auto idx = constraint.toConstraintIDX(params.waypoints.size());
        idx.has_value() && constraint.enabled) {
      constraints.push_back(idx.value());
    }
  }
  // Clean up malformed data: if 'to' is the same as 'from', we can treat it as a waypoint constraint instead of a segment constraint, since it only applies to one waypoint and doesn't actually constrain the segment between two waypoints. If 'to' is less than 'from', we can swap them so that 'from' is always less than 'to', which simplifies processing later on.
  for (auto& constraint : constraints) {
    if (constraint.to.has_value()) {
      if (constraint.to.value() == constraint.from) {
        constraint.to = std::nullopt;
      } else if (constraint.to.value() < constraint.from) {
        auto temp = constraint.to.value();
        constraint.to = constraint.from;
        constraint.from = temp;
      }
    } else {
      // This is a waypoint constraint already.
      continue;
    }
  }
  // Convert the constraint data into a format independent of the locations of its from and to waypoints.
  // Later, the constraints will be split to each consecutive waypoint pair.
  for (auto& constraint : constraints) {
    if (constraint.to.has_value()) {
      auto from_wpt = params.waypoints.at(constraint.from);
      auto to_wpt = params.waypoints.at(constraint.to.value());
      constraint.data = std::visit(
          [&from_wpt, &to_wpt](const auto& data) {
            return ConstraintData::ConstraintVariant(
                data.forEndpoints(from_wpt, to_wpt));
          },
          constraint.data);
    }
  }

  
  std::vector<bool> is_unconstrained(params.waypoints.size(), true);
  // Mark waypoints that are referenced by constraints as not being initial
  // guesses.
  // SAFETY: The constraints have already been validated to ensure that their 'from' and 'to' indices are within bounds of the waypoints vector, so these accesses are safe.
  for (const auto& constraint : constraints) {
    if (constraint.to) {
      is_unconstrained.at(constraint.to.value()) = false;
    }
    is_unconstrained.at(constraint.from) = false;
  }
  // First waypoint can't be an initial guess,
                                   // since it's the start of the path
  is_unconstrained.at(0) = false;  
  // Last waypoint can't be an initial guess, since it's the end of the path
  is_unconstrained.at(is_unconstrained.size() - 1) = false;

  std::vector<Segment> segments;
  // Create the segments. 
  for (const auto& [i, tuple] :
       (std::views::zip(params.waypoints, is_unconstrained) |
        std::views::enumerate)) {
    const auto [waypoint, unconstrained] = tuple;
    const auto isInitialGuess =
        unconstrained && !waypoint.fix_translation && !waypoint.fix_heading;
    segments.push_back(
        Segment{.start = waypoint, .coalesce_with_previous = isInitialGuess});
  }

  // Apply the constraints.
  // we already verified that to, if it exists, is greater than from, so we can just apply the constraint to every segment between from and to, exclusive of to. 
  for (const auto& constraint : constraints) {
    if (constraint.to) {  // Apply to every segment between 'from' and
                                // 'to', exclusive of 'to'
      for (size_t i = constraint.from; i < constraint.to.value(); i++) {
        segments.at(i).segment_constraints.push_back(constraint.data);
      }
    } else {  // Apply only to the waypoint at 'from', which is the start of the
              // segment, since the constraint is a waypoint constraint

      segments.at(constraint.from)
          .waypoint_constraints.push_back(constraint.data);
    }
  }
  return segments;
}

Segment estimate_segment_time(const Segment& segment, const Segment& next,
                              const RobotConfig& config) {
  // For now, just return the segment with no estimated time. In the future, we
  // can use the constraints on the segment and the robot config to estimate
  // how long it would take to execute, which can be used as a better initial
  // guess for the optimizer and also to set time bounds on the segments.
  Segment modified_segment = segment;
  modified_segment.estimated_time =
      40 * 0.02_s;  // 40 intervals at the target dt, which is a common default
                    // for optimization problems
  return modified_segment;
}
}  // namespace choreo
