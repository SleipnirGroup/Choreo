#pragma once 
#include <numbers>
#include <print>
#include <string>
#include <vector>
#include <ranges>
#include <choreo/constraint.hpp>
#include <choreo/robot_config.hpp>
#include <choreo/waypoint.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#include <wpi/util/json.hpp>

#include <choreo/constraint_data/constraint_data.hpp>
#include <choreo/expr.hpp>
#include <choreo/trajectory/swerve_sample.hpp>
#include <choreo/parameters.hpp>
#include <wpi/math/geometry/Pose2d.hpp>
namespace choreo {

struct Segment {
  Waypoint start;
  
  std::optional<wpi::units::second_t> estimated_time = std::nullopt;
  std::vector<ConstraintData::ConstraintVariant> segment_constraints;
  std::vector<ConstraintData::ConstraintVariant> waypoint_constraints;
  bool coalesce_with_previous = false;  // Whether this segment should be merged with the previous one in the optimization problem, by treating the first following point as the start of the segment instead of the constrained waypoint. This is used for waypoints that are marked as initial guesses, since they aren't actually constrained and can be treated as part of the previous segment for optimization purposes.
  /// Returns the number of intervals that should be used for this segment in the optimization problem, based on the estimated time and the target_dt, or the override_intervals if that is set. If neither is available, returns nullopt, which indicates that the optimizer should use a default value. If the override_intervals is set but is less than the number of intervals that would be estimated based on the estimated time and target_dt, a warning is printed since this may lead to a suboptimal trajectory. If the estimated time is very large compared to the target_dt, a warning is also printed since this may indicate an issue with the time estimation and could lead to a very long optimization time or an inability to find a solution.
  std::optional<size_t> interval_count(wpi::units::second_t target_dt) const {
    if (start.override_intervals) {
      return std::optional<size_t>(start.intervals);

    } else {
        if (!estimated_time.has_value()) {
            std::println("Warning: Waypoint at ({}, {}) does not have override_intervals set and estimated_time is not available, so interval_count cannot be determined. Returning nullopt.", start.x.val.value(), start.y.val.value());
            return std::nullopt;
        }
        if (estimated_time.value() > target_dt * 1000) {  // Arbitrary threshold of 1000 intervals, which is likely more than enough for any reasonable trajectory and indicates that something may have gone wrong with the time estimation.
            std::println("Warning: Waypoint at ({}, {}) has estimated_time of {}, which would require {} intervals at target_dt of {}. This may indicate that the time estimation is inaccurate or that the constraints on this segment are very difficult to satisfy, and could lead to a very long optimization time or an inability to find a solution.",
              start.x.val.value(), start.y.val.value(), estimated_time.value().value(), static_cast<size_t>(std::ceil((double) (estimated_time.value() / target_dt))), target_dt.value());
        }
        return std::optional<size_t>(static_cast<size_t>(std::ceil((estimated_time.value() / target_dt).value())));
    }
    return start.override_intervals ? std::optional<size_t>(start.intervals) : estimated_time.has_value() ? std::optional<size_t>(static_cast<size_t>(std::ceil((double) (estimated_time.value() / target_dt)))) : std::nullopt;
  }
};
inline void to_json(wpi::util::json& json, const Segment& segment) {
  json = wpi::util::json::object(
      "start", segment.start,
      "segment_constraints", segment.segment_constraints,
      "waypoint_constraints", segment.waypoint_constraints, "coalesce_with_previous", segment.coalesce_with_previous);
    if (segment.estimated_time.has_value()) {
      json["estimated_time"] = segment.estimated_time.value().value();
    } else {
      json["estimated_time"] = nullptr;
    }
}
inline void from_json(const wpi::util::json& json, Segment& segment) {
  segment.start = json.at("start").get<Waypoint>();
  segment.coalesce_with_previous = json.at("coalesce_with_previous").get_bool();
  if (json.contains("estimated_time") && !json.at("estimated_time").is_null()) {
    segment.estimated_time = wpi::units::second_t(json.at("estimated_time").get_number());
  }
  segment.segment_constraints =
      json.at("segment_constraints")
          .get_array()
          | std::views::transform([](const wpi::util::json& constraintJson) {
              return constraintJson.get<ConstraintData::ConstraintVariant>();
            })
          | std::ranges::to<std::vector<ConstraintData::ConstraintVariant>>();
  segment.waypoint_constraints =
      json.at("waypoint_constraints")
          .get_array()
          | std::views::transform([](const wpi::util::json& constraintJson) {
              return constraintJson.get<ConstraintData::ConstraintVariant>();
            })
          | std::ranges::to<std::vector<ConstraintData::ConstraintVariant>>();
          }
        }