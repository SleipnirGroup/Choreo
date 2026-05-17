// Copyright (c) Choreo contributors

#include <numbers>
#include <print>
#define WITH_TRAJOPT
#include <string>

#include <data/robot_config.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#include <wpi/util/json.hpp>

#include "data/expr.hpp"

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

int main() {
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
  std::println("Parsed, re-serialized config: {}",
               wpi::util::json(configExp).to_string_pretty());

  trajopt::LinearVelocityMaxMagnitudeConstraint zero_linear_velocity{0.0};
  trajopt::AngularVelocityMaxMagnitudeConstraint zero_angular_velocity{0.0};

  // Example 1: Swerve, one meter forward motion profile
  {
    trajopt::SwervePathBuilder path;
    path.set_drivetrain(configExp.to_swerve_drivetrain());
    path.pose_wpt(0, 0.0, 0.0, 0.0);
    path.pose_wpt(1, 1.0, 0.0, 0.0);
    path.wpt_constraint(0, zero_linear_velocity);
    path.wpt_constraint(1, zero_linear_velocity);
    path.set_control_interval_counts({40});

    trajopt::SwerveTrajectoryGenerator generator{path};
    if (auto solution = generator.generate(true); !solution) {
      std::println("Error in example 1: {}", solution.error());
      return std::to_underlying(solution.error());
    }
  }
}
