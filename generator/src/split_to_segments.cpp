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
#include <choreo/swerve_sample.hpp>
#include <choreo/waypoint.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#include <wpi/math/geometry/Pose2d.hpp>
#include <wpi/util/json.hpp>

#include "segment.hpp"
namespace choreo {
std::vector<Segment> convert_to_segments(const Parameters& params) {
  std::vector<ConstraintIDX> constraints;
  for (const auto& constraint : params.constraints) {
    if (auto idx = constraint.toConstraintIDX(params.waypoints.size());
        idx.has_value() && constraint.enabled) {
      constraints.push_back(idx.value());
    }
  }
  std::vector<bool> is_unconstrained(params.waypoints.size(), true);
  // Mark waypoints that are referenced by constraints as not being initial
  // guesses.
  for (const auto& constraint : constraints) {
    std::println(
        "Constraint from {} to {}: data={}", constraint.from,
        constraint.to.has_value() ? std::to_string(constraint.to.value())
                                  : "none",
        std::visit(
            [](const auto& data) {
              return wpi::util::json(data).to_string_pretty();
            },
            constraint.data));
    if (constraint.to) {
      if (constraint.to.value() >= is_unconstrained.size()) {
        std::println(
            "Error: Constraint 'to' index {} is out of bounds for waypoints "
            "size {}",
            constraint.to.value(), is_unconstrained.size());
        continue;
      }
      is_unconstrained.at(constraint.to.value()) = false;
    }
    if (constraint.from >= is_unconstrained.size()) {
      std::println(
          "Error: Constraint 'from' index {} is out of bounds for waypoints "
          "size {}",
          constraint.from, is_unconstrained.size());
      continue;
    }
    is_unconstrained.at(constraint.from) = false;
  }
  is_unconstrained.at(0) = false;  // First waypoint can't be an initial guess,
                                   // since it's the start of the path
  is_unconstrained.at(is_unconstrained.size() - 1) = false;
  // Last waypoint can't be an initial guess, since it's the end of the path
  // Now we can iterate through the waypoints and constraints together to build
  // segments of the path, where each segment starts with a constrained waypoint
  // and is followed by any number of unconstrained waypoints that can be used
  // as initial guesses for the optimizer.
  std::vector<Segment> segments;
  std::vector<size_t> initialGuessWaypointIndices;
  for (const auto& [i, tuple] :
       (std::views::zip(params.waypoints, is_unconstrained) |
        std::views::enumerate)) {
    const auto [waypoint, unconstrained] = tuple;
    const auto isInitialGuess =
        unconstrained && !waypoint.fix_translation && !waypoint.fix_heading;
    segments.push_back(
        Segment{.start = waypoint, .coalesce_with_previous = isInitialGuess});
  }

  for (const auto& constraint : constraints) {
    if (constraint.to && constraint.to.value() > constraint.from) {  // Apply to every segment between 'from' and 'to',
                          // exclusive of 'to'
      for (size_t i = constraint.from; i < constraint.to.value(); i++) {
        segments.at(i).segment_constraints.push_back(constraint.data);
      }
    } else {  // Apply only to the waypoint at 'from', which is the start of the
              // segment, since the constraint is a waypoint constraint

      segments.at(constraint.from)
          .waypoint_constraints.push_back(constraint.data);
    }
  }

  // Now we have the segments, each with the constraints that apply to them, and
  // we can estimate the time each would take individually.
  return segments;
}

Segment estimate_segment_time(const Segment& segment, const Segment& next, const RobotConfig& config) {
  // For now, just return the segment with no estimated time. In the future, we
  // can use the constraints on the segment and the robot config to estimate
  // how long it would take to execute, which can be used as a better initial
  // guess for the optimizer and also to set time bounds on the segments.
  Segment modified_segment = segment;
  modified_segment.estimated_time = 40 * 0.02_s;  // 40 intervals at the target dt, which is a common default for
                                  // optimization problems
  return modified_segment;
}
}  // namespace choreo