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
                     .enabled = false},
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
  
  auto traj_unscratch = traj;
  
  choreo::TrajectoryGenerator<choreo::SwerveDriveType, trajopt::SwerveSolution,
                              trajopt::SwerveDrivetrain,
                              trajopt::SwerveTrajectoryGenerator, trajopt::SwerveTrajectory>
  //choreo::TrajectoryGenerator<choreo::DifferentialSample, trajopt::DifferentialSolution, trajopt::DifferentialDrivetrain, trajopt::DifferentialTrajectoryGenerator, trajopt::DifferentialTrajectory>
      generator(chor, traj);
  auto samples = generator.generate();
  if (!samples) {
    return std::to_underlying(samples.error());
  } else {
    using DriveType = typename decltype(generator)::DriveType;
    auto output = choreo::Trajectory<DriveType> {
      configExp, {}, DriveType::WPILibTrajectory{*samples}, {}
    };
    traj_unscratch.trajectory = output;
    traj_unscratch.params = params_orig;
    
      {
    std::ofstream out("out.traj");
    out << std::string(wpi::util::json(traj_unscratch).to_string_pretty());
    out.close();
  }
    auto svg = choreo::render::render(*samples, configExp, traj.params,
                           choreo::render::path_gradient::linearVelocity);
    auto graphs = choreo::render::graph(*samples);
      {
        std::ofstream out("graphs.svg");
        out << std::string(graphs);
        out.close();
      }
  }
}
