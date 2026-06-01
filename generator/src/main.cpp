// Copyright (c) Choreo contributors

#include <iterator>
#include <numbers>
#include <print>
#include <ranges>
#include <string>
#include <vector>

#include <choreo/constraint.hpp>
#include <choreo/constraint_data/constraint_data.hpp>
#include <choreo/drive_type.hpp>
#include <choreo/expr.hpp>
#include <choreo/gradient.hpp>
#include <choreo/parameters.hpp>
#include <choreo/project.hpp>
#include <choreo/renderer.hpp>
#include <choreo/robot_config.hpp>
#include <choreo/trajectory/swerve_sample.hpp>
#include <choreo/variables/variable.hpp>
#include <choreo/variables/variables.hpp>
#include <choreo/waypoint.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#include <wpi/math/geometry/Pose2d.hpp>
#include <wpi/util/json.hpp>

#include "defaults.hpp"
#include "segment.hpp"
#include "split_to_segments.hpp"

const choreo::Parameters params_orig{
    .waypoints = {{.x = 0_m,
                   .y = 0_m,
                   .heading = 0_rad,
                   .fix_translation = true,
                   .fix_heading = true},
                  {.x = 0.5_m,
                   .y = 0.5_m,
                   .heading = 0.5_rad,
                   .fix_translation = true,
                   .fix_heading = true},
                  {.x = 1_m,
                   .y = -1.2_m,
                   .heading = 2_rad,
                   .fix_translation = false,
                   .fix_heading = false},

                  {.x = 1.2_m,
                   .y = -1_m,
                   .heading = 1_rad,
                   .fix_translation = true,
                   .fix_heading = true}},
    .constraints = {{.from = choreo::FirstWaypoint{},
                     .to = std::nullopt,
                     .data = choreo::ConstraintData::MaxVelocity{.max = 0_mps},
                     .enabled = true},
                    {.from = choreo::FirstWaypoint{},
                     .to = std::nullopt,
                     .data = choreo::ConstraintData::MaxAngularVelocity{},
                     .enabled = true},
                    {.from = choreo::LastWaypoint{},
                     .to = std::nullopt,
                     .data = choreo::ConstraintData::MaxVelocity{.max = 0_mps},
                     .enabled = true},
                    {.from = choreo::LastWaypoint{},
                     .to = std::nullopt,
                     .data = choreo::ConstraintData::MaxAngularVelocity{},
                     .enabled = true},
                    {.from = choreo::WaypointIDX{.idx = 2},
                     .to = choreo::WaypointIDX{.idx = 2},
                     .data =
                         choreo::ConstraintData::KeepInCircle{
                             .x = 1_m, .y = -1.2_m, .r = 0.75_m},
                     .enabled = true}},
    .target_dt = 0.02_s};

// This function would apply the segments to the optimization problem, for
// example by adding the appropriate constraints and decision variables for each
// segment. For now we'll just print out the segments to verify that they're
// being generated correctly.

int main() {
  auto chor = choreo::defaultNewProject();
  auto configExp = chor.config;
  auto traj = choreo::defaultNewTrajectory();
  traj.params = params_orig;
  auto segments = choreo::convert_to_segments(traj.params);
  // std::println("{}", wpi::util::json(configExp).to_string_pretty());
  segments = choreo::estimate_segment_times(segments, configExp);
  // std::println("Segments with estimated times:");
  // std::println("{}", wpi::util::json(segments).to_string_pretty());

  // Example 1: Swerve, one meter forward motion profile
  trajopt::SwervePathBuilder path;
  path.set_drivetrain(configExp.to_swerve_drivetrain());
  auto bumpers = configExp.to_bumpers();
  path.set_bumpers(bumpers);
  // Apply waypoint constraints and initial guesses
  std::vector<trajopt::Pose2d> initial_guess_points;
  std::vector<choreo::Segment> only_waypoint_segments;
  for (int i = 0; i < segments.size(); i++) {
    const auto& wpt = segments[i].start;
    if (!segments[i].coalesce_with_previous) {
      path.sgmt_initial_guess_points(only_waypoint_segments.size(),
                                     initial_guess_points);
      initial_guess_points.clear();
      if (wpt.fix_translation && wpt.fix_heading) {
        path.pose_wpt(only_waypoint_segments.size(), wpt.x.val.value(),
                      wpt.y.val.value(), wpt.heading.val.value());
      } else if (wpt.fix_translation && !wpt.fix_heading) {
        path.translation_wpt(only_waypoint_segments.size(), wpt.x.val.value(),
                             wpt.y.val.value());
      } else if (!wpt.fix_translation && wpt.fix_heading) {
      } else {
        path.wpt_initial_guess_point(only_waypoint_segments.size(),
                                     wpt.toTrajoptPose2d());
      }
      only_waypoint_segments.push_back(segments[i]);
    } else {
      initial_guess_points.push_back(wpt.toTrajoptPose2d());
    }
  }

  const auto bumperSet = path.get_bumpers();
  // Now that our segments list is reindexed to match TrajoptLib's counts, we
  // can apply the constraints
  for (int j = 0; j < only_waypoint_segments.size();
       j++) {  // only for waypoints with a segment after them.
    if (j < only_waypoint_segments.size() - 1) {
      for (const auto& constraint :
           only_waypoint_segments[j].segment_constraints) {
        const auto& wpt = only_waypoint_segments[j].start;
        // should never hit the nullopt case
        const auto& next_wpt =
            j + 1 < only_waypoint_segments.size()
                ? std::optional{only_waypoint_segments[j + 1].start}
                : std::nullopt;
        path.sgmt_constraint(
            j, j + 1,
            std::visit(
                [&wpt, &next_wpt,
                 &bumperSet](const auto& c) -> trajopt::Constraint {
                  return c.toTrajoptConstraint(wpt, next_wpt, bumperSet);
                },
                constraint));
      }
    }
    for (const auto& constraint :
         only_waypoint_segments[j].waypoint_constraints) {
      const auto& wpt = only_waypoint_segments[j].start;

      path.wpt_constraint(j, std::visit(
                                 [&wpt](const auto& c) -> trajopt::Constraint {
                                   return c.toTrajoptConstraint(
                                       wpt, std::nullopt,
                                       std::vector<trajopt::KeepOutRegion>{});
                                 },
                                 constraint));
    }
  }

  trajopt::SwerveTrajectoryGenerator generator{path};
  auto solution = generator.generate(true);
  std::println("\ndone\n");
  if (!solution) {
    std::println("Error in example 1: {}", solution.error());
    return std::to_underlying(solution.error());
  } else {
    trajopt::SwerveTrajectory trajectory =
        trajopt::SwerveTrajectory(solution.value());
    std::println("Example 1 trajectory:");
    std::vector<choreo::SwerveSample> samples;
    samples.reserve(trajectory.samples.size());
    for (const auto& sample : trajectory.samples) {
      samples.emplace_back(choreo::SwerveSample(sample));
    }
    choreo::render::render(samples, configExp, traj.params,
                           choreo::render::path_gradient::linearVelocity);
  }
}
