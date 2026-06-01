// Copyright (c) Choreo contributors

#include <iterator>
#include <numbers>
#include <print>
#include <ranges>
#include <string>
#include <vector>

#include <choreo/project.hpp>
#include <choreo/constraint.hpp>
#include <choreo/constraint_data/constraint_data.hpp>
#include <choreo/expr.hpp>
#include <choreo/gradient.hpp>
#include <choreo/parameters.hpp>
#include <choreo/renderer.hpp>
#include <choreo/robot_config.hpp>
#include <choreo/drive_type.hpp>
#include <choreo/variables/variables.hpp>
#include <choreo/swerve_sample.hpp>
#include <choreo/waypoint.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#include <wpi/math/geometry/Pose2d.hpp>
#include <wpi/util/json.hpp>

#include "segment.hpp"
#include "split_to_segments.hpp"
#include <choreo/variables/variable.hpp>

// Eventually this string comes in via a JSON file, but for now we'll hardcode
// it here for testing purposes
const std::string robotConfigJson = R"({
  "cof": {
    "exp": "1.5",
    "val": 1.5
  },
  "differential_track_width": {
    "exp": "0.5588 m",
    "val": 0.5588
  },
  "gearing": {
    "exp": "6.5",
    "val": 6.5
  },
  "inertia": {
    "exp": "6 kg m^2",
    "val": 6
  },
  "mass": {
    "exp": "68.0388555 kg",
    "val": 68.0388555
  },
  "radius": {
    "exp": "0.0508 m",
    "val": 0.0508
  },
  "tmax": {
    "exp": "1.2 N*m",
    "val": 1.2
  },
  "vmax": {
    "exp": "6000.0 RPM",
    "val": 628.3185307179587
  },
  "wheels": [{
    "x": {
      "exp": "0.2794 m",
      "val": 0.2794
    },
    "y": {
      "exp": "0.2794 m",
      "val": 0.2794
    }
  }, {
    "x": {
      "exp": "0.2794 m",
      "val": 0.2794
    },
    "y": {
      "exp": "-0.2794 m",
      "val": -0.2794
    }
  }, {
    "x": {
      "exp": "-0.2794 m",
      "val": -0.2794
    },
    "y": {
      "exp": "-0.2794 m",
      "val": -0.2794
    }
  }, {
    "x": {
      "exp": "-0.2794 m",
      "val": -0.2794
    },
    "y": {
      "exp": "0.2794 m",
      "val": 0.2794
    }
  }]
})";


// SwervePathBuilder is used to build paths that are optimized into full
// trajectories.
//
// "Wpt" stands for waypoint, an instantaneous moment in the path where certain
// constrains on the robot's state are applied.
//
// "Sgmt" is the abbreviation for segments, the continuum of state between
// waypoints where constraints can also be applied.
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

  std::ifstream trajIn;
  trajIn.open("trajectory.traj");
  std::string traj{std::istreambuf_iterator<char>(trajIn), std::istreambuf_iterator<char>()};
  auto paramsOpt = wpi::util::json::parse(traj).and_then(
    [](wpi::util::json json)
        -> wpi::util::expected<choreo::Parameters, std::string> {
      try {
        return json.get<choreo::Parameters>();
      } catch (const std::exception& e) {
        // return an expected that contains an unexpected error value
        return wpi::util::unexpected<std::string>(std::string(e.what()));
      }
    });
  if (!paramsOpt) {
    std::println("Error parsing traj JSON: {}",
                 paramsOpt.error());
    return 1;
  }
  auto params = paramsOpt.value();
  auto segments = choreo::convert_to_segments(params);
  std::println("Segments:");
  std::println("{}", wpi::util::json(segments).to_string_pretty());
  std::ifstream chorIn;
  chorIn.open("projectout.chor");
  std::string chor{std::istreambuf_iterator<char>(chorIn),
                   std::istreambuf_iterator<char>()};
  std::println("{}", chor);
  auto robotConfigJsonParsed = wpi::util::json::parse(chor).and_then(
      [](wpi::util::json json)
          -> wpi::util::expected<choreo::RobotConfig, std::string> {
        try {
          return json.get<choreo::ProjectFile>().config;
        } catch (const std::exception& e) {
          // return an expected that contains an unexpected error value
          return wpi::util::unexpected<std::string>(std::string(e.what()));
        }
      });

  if (!robotConfigJsonParsed) {
    std::println("Error parsing robot config JSON: {}",
                 robotConfigJsonParsed.error());
    return 1;
  }

  choreo::RobotConfig configExp = robotConfigJsonParsed.value();
  /*
  const choreo::ProjectFile project{
  .name = "MyProject",
  .version = 4,
  .type=choreo::DriveType::Swerve,
  .variables={
    {
      {"var", 1_m},
      {"foo", 1_rad_per_s}
    },
    {{"center", {0_m, 0_m}}},
    {{"pose", {1_m, 1_m, 2_rad}}},
    {{"region", {1_m, 1_m, 2_rad, 2_m, 3_m}}}
  },
  .config=configExp
};
std::println("{}", wpi::util::json(project).to_string_pretty());
  std::ofstream chorOut;
  chorOut.open("projectout.chor");
  chorOut<< wpi::util::json(project).to_string_pretty();
  chorOut.close();*/
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
    std::chrono::steady_clock::time_point start =
        std::chrono::steady_clock::now();
    auto json_string = wpi::util::json(samples).to_string_pretty();
    std::chrono::steady_clock::time_point end =
        std::chrono::steady_clock::now();
    // std::println("Serialized trajectory JSON: {}", json_string);
    std::println(
        "Serialization time taken: {} m s",
        std::chrono::duration_cast<std::chrono::milliseconds>(end - start)
            .count());
    choreo::render::render(samples, configExp, params,
                           choreo::render::path_gradient::linearVelocity);
  }
}
