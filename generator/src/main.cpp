// Copyright (c) Choreo contributors

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
#include <choreo/swerve_sample.hpp>
#include <choreo/parameters.hpp>
#include <wpi/math/geometry/Pose2d.hpp>
#include "segment.hpp"
#include "split_to_segments.hpp"




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
const choreo::Parameters params{
  .waypoints = {
    {.x = 0_m, .y = 0_m, .heading = 0_rad, .fix_translation = true, .fix_heading = true},
    {.x = 0.5_m, .y = 0.5_m, .heading = 0.5_rad, .fix_translation = false, .fix_heading = false},
    {.x = 1_m, .y = 0_m, .heading = 0_rad, .fix_translation = true, .fix_heading = true}
  },
  .constraints = {
    // {.from = choreo::FirstWaypoint{}, .to = std::nullopt, .data = choreo::ConstraintData::MaxVelocity{.max = 0_mps}, .enabled = true},
    // {.from = choreo::LastWaypoint{}, .to = std::nullopt, .data = choreo::ConstraintData::MaxVelocity{.max = 0_mps}, .enabled = true},
      {.from = choreo::WaypointIDX{.idx = 0}, .to = choreo::WaypointIDX{.idx = 2}, .data = choreo::ConstraintData::KeepInCircle{.x = 0_m, .y = 0_m, .r= 5_m}, .enabled = true}
  },
  .target_dt = 0.02_s
};


  // This function would apply the segments to the optimization problem, for example by adding the appropriate constraints and decision variables for each segment. For now we'll just print out the segments to verify that they're being generated correctly.

int main() {
  auto segments = choreo::convert_to_segments(params);
 std::println("Segments:");
  std::println("{}", wpi::util::json(segments).to_string_pretty());


  auto robotConfigJsonParsed =
      wpi::util::json::parse(robotConfigJson)
          .and_then(
              [](wpi::util::json json)
                  -> wpi::util::expected<choreo::RobotConfig, std::string> {
                try {
                  return json.get<choreo::RobotConfig>();
                } catch (const std::exception& e) {
                  // return an expected that contains an unexpected error value
                  return wpi::util::unexpected<std::string>(
                      std::string(e.what()));
                }
              });

  if (!robotConfigJsonParsed) {
    std::println("Error parsing robot config JSON: {}",
                 robotConfigJsonParsed.error());
    return 1;
  }
  choreo::RobotConfig configExp = robotConfigJsonParsed.value();

    segments = choreo::estimate_segment_times(segments, configExp);
    std::println("Segments with estimated times:"); 
    std::println("{}", wpi::util::json(segments).to_string_pretty());
  // Example 1: Swerve, one meter forward motion profile
  if (false) {
    trajopt::SwervePathBuilder path;
    path.set_drivetrain(configExp.to_swerve_drivetrain());
    trajopt::SwerveTrajectoryGenerator generator{path};
    auto solution = generator.generate(true);
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
      std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
      auto json_string = wpi::util::json(samples).to_string_pretty();
      std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
      std::println("Serialized trajectory JSON: {}", json_string);
      std::println("Time taken: {} ms", std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count());
    }
  }
}
