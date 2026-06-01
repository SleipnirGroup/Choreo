// Copyright (c) Choreo contributors

#include <iterator>
#include <numbers>
#include <print>
#include <ranges>
#include <string>
#include <type_traits>
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
#include <generator.hpp>
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
  // choreo::TrajectoryGenerator<choreo::SwerveSample, trajopt::SwerveSolution,
  //                             trajopt::SwerveDrivetrain,
  //                             trajopt::SwerveTrajectoryGenerator, trajopt::SwerveTrajectory>
  choreo::TrajectoryGenerator<choreo::DifferentialSample, trajopt::DifferentialSolution, trajopt::DifferentialDrivetrain, trajopt::DifferentialTrajectoryGenerator, trajopt::DifferentialTrajectory>
      generator(chor, traj);
  auto samples = generator.generate();
  if (!samples) {
    return std::to_underlying(samples.error());
  } else {
    std::println("Generated trajectory:");
    wpi::util::json json = wpi::util::json::array();
    for (const auto& sample : *samples) {
      wpi::util::json element;
      element = sample;
      json.emplace_back(std::move(element));
    }
    std::println("{}", json.to_string_pretty());
    // choreo::render::render(*samples, configExp, traj.params,
    //                        choreo::render::path_gradient::linearVelocity);
  }
}
