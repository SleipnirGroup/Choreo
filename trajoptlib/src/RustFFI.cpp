// Copyright (c) TrajoptLib contributors

#include "RustFFI.hpp"

#include <stdint.h>

#include <algorithm>
#include <cstddef>
#include <memory>
#include <utility>
#include <vector>

#include "trajopt/constraint/AngularVelocityMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/LaneConstraint.hpp"
#include "trajopt/constraint/LinearAccelerationMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/LinearVelocityDirectionConstraint.hpp"
#include "trajopt/constraint/LinearVelocityMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/PointAtConstraint.hpp"
#include "trajopt/constraint/PointLineRegionConstraint.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/spline/Spline.hpp"
#include "trajopt/util/Cancellation.hpp"
#include "trajoptlib/src/lib.rs.h"

namespace trajopt::rsffi {

void SwerveTrajectoryGenerator::set_drivetrain(
    const SwerveDrivetrain& drivetrain) {
  std::vector<trajopt::Translation2d> cppModules;
  for (const auto& module : drivetrain.modules) {
    cppModules.emplace_back(module.x, module.y);
  }

  path_builder.SetDrivetrain(trajopt::SwerveDrivetrain{
      drivetrain.mass, drivetrain.moi, drivetrain.wheel_radius,
      drivetrain.wheel_max_angular_velocity, drivetrain.wheel_max_torque,
      std::move(cppModules)});
}

void SwerveTrajectoryGenerator::set_bumpers(double front, double left,
                                            double right, double back) {
  path_builder.SetBumpers(front, left, right, back);
}

void SwerveTrajectoryGenerator::set_control_interval_counts(
    const rust::Vec<size_t> counts) {
  std::vector<size_t> cppCounts;
  for (const auto& count : counts) {
    cppCounts.emplace_back(count);
  }

  path_builder.SetControlIntervalCounts(std::move(cppCounts));
}

void SwerveTrajectoryGenerator::sgmt_initial_guess_points(
    size_t from_index, const rust::Vec<Pose2d>& guess_points) {
  std::vector<trajopt::Pose2d> cppGuessPoints;
  for (const auto& guess_point : guess_points) {
    cppGuessPoints.emplace_back(guess_point.x, guess_point.y,
                                guess_point.heading);
  }

  path_builder.SgmtInitialGuessPoints(from_index, std::move(cppGuessPoints));
}

void SwerveTrajectoryGenerator::pose_wpt(size_t index, double x, double y,
                                         double heading) {
  path_builder.PoseWpt(index, x, y, heading);
}

void SwerveTrajectoryGenerator::translation_wpt(size_t index, double x,
                                                double y,
                                                double heading_guess) {
  path_builder.TranslationWpt(index, x, y, heading_guess);
}

void SwerveTrajectoryGenerator::empty_wpt(size_t index, double x_guess,
                                          double y_guess,
                                          double heading_guess) {
  path_builder.WptInitialGuessPoint(index, {x_guess, y_guess, heading_guess});
}

void SwerveTrajectoryGenerator::wpt_linear_velocity_direction(size_t index,
                                                              double angle) {
  path_builder.WptConstraint(index,
                             trajopt::LinearVelocityDirectionConstraint{angle});
}

void SwerveTrajectoryGenerator::wpt_linear_velocity_max_magnitude(
    size_t index, double magnitude) {
  path_builder.WptConstraint(
      index, trajopt::LinearVelocityMaxMagnitudeConstraint{magnitude});
}

void SwerveTrajectoryGenerator::wpt_angular_velocity_max_magnitude(
    size_t index, double angular_velocity) {
  path_builder.WptConstraint(
      index, trajopt::AngularVelocityMaxMagnitudeConstraint{angular_velocity});
}

void SwerveTrajectoryGenerator::wpt_linear_acceleration_max_magnitude(
    size_t index, double magnitude) {
  path_builder.WptConstraint(
      index, trajopt::LinearAccelerationMaxMagnitudeConstraint{magnitude});
}

void SwerveTrajectoryGenerator::wpt_point_at(size_t index, double field_point_x,
                                             double field_point_y,
                                             double heading_tolerance,
                                             bool flip) {
  path_builder.WptConstraint(
      index, trajopt::PointAtConstraint{
                 trajopt::Translation2d{field_point_x, field_point_y},
                 heading_tolerance, flip});
}

void SwerveTrajectoryGenerator::wpt_keep_in_circle(size_t index,
                                                   double field_point_x,
                                                   double field_point_y,
                                                   double keep_in_radius) {
  for (size_t bumper = 0; bumper < path_builder.GetBumpers().size(); bumper++) {
    for (size_t i = 0; i < path_builder.GetBumpers().at(bumper).points.size();
         i++) {
      path_builder.WptConstraint(
          index, trajopt::PointPointMaxConstraint{
                     path_builder.GetBumpers().at(bumper).points.at(i),
                     {field_point_x, field_point_y},
                     keep_in_radius});
    }
  }
  path_builder.WptConstraint(
      index, trajopt::PointPointMaxConstraint{
                 {0.0, 0.0}, {field_point_x, field_point_y}, keep_in_radius});
}

void SwerveTrajectoryGenerator::wpt_keep_in_polygon(
    size_t index, rust::Vec<double> field_points_x,
    rust::Vec<double> field_points_y) {
  if (field_points_x.size() != field_points_y.size()) {
    return;
  }
  for (size_t i = 0; i < field_points_x.size(); i++) {
    auto j = (i + 1) % field_points_x.size();
    path_builder.WptConstraint(index,
                               trajopt::PointLineRegionConstraint{
                                   {0.0, 0.0},
                                   {field_points_x[i], field_points_y[i]},
                                   {field_points_x[j], field_points_y[j]},
                                   Side::kAbove});
    for (const auto& bumper : path_builder.GetBumpers()) {
      for (const auto& corner : bumper.points) {
        path_builder.WptConstraint(index,
                                   trajopt::PointLineRegionConstraint{
                                       corner,
                                       {field_points_x[i], field_points_y[i]},
                                       {field_points_x[j], field_points_y[j]},
                                       Side::kAbove});
      }
    }
  }
}

void SwerveTrajectoryGenerator::wpt_keep_in_lane(
    size_t index, double center_line_start_x, double center_line_start_y,
    double center_line_end_x, double center_line_end_y, double tolerance) {
  path_builder.WptConstraint(
      index, trajopt::LaneConstraint{{center_line_start_x, center_line_start_y},
                                     {center_line_end_x, center_line_end_y},
                                     tolerance});
}

void SwerveTrajectoryGenerator::wpt_keep_out_circle(size_t index, double x,
                                                    double y, double radius) {
  for (size_t bumper = 0; bumper < path_builder.GetBumpers().size(); bumper++) {
    for (size_t i = 0; i < path_builder.GetBumpers().at(bumper).points.size();
         i++) {
      path_builder.WptConstraint(
          index, trajopt::PointPointMinConstraint{
                     path_builder.GetBumpers().at(bumper).points.at(i),
                     {x, y},
                     radius});
      path_builder.WptConstraint(
          index,
          trajopt::LinePointConstraint{
              path_builder.GetBumpers().at(bumper).points.at(i),
              path_builder.GetBumpers().at(bumper).points.at(
                  (i + 1) % path_builder.GetBumpers().at(bumper).points.size()),
              {x, y},
              radius});
    }
  }
}

void SwerveTrajectoryGenerator::sgmt_linear_velocity_direction(
    size_t from_index, size_t to_index, double angle) {
  path_builder.SgmtConstraint(
      from_index, to_index, trajopt::LinearVelocityDirectionConstraint{angle});
}

void SwerveTrajectoryGenerator::sgmt_linear_velocity_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::LinearVelocityMaxMagnitudeConstraint{magnitude});
}

void SwerveTrajectoryGenerator::sgmt_angular_velocity_max_magnitude(
    size_t from_index, size_t to_index, double angular_velocity) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::AngularVelocityMaxMagnitudeConstraint{angular_velocity});
}

void SwerveTrajectoryGenerator::sgmt_linear_acceleration_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::LinearAccelerationMaxMagnitudeConstraint{magnitude});
}

void SwerveTrajectoryGenerator::sgmt_point_at(
    size_t from_index, size_t to_index, double field_point_x,
    double field_point_y, double heading_tolerance, bool flip) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::PointAtConstraint{
          {field_point_x, field_point_y}, heading_tolerance, flip});
}

void SwerveTrajectoryGenerator::sgmt_keep_in_circle(size_t from_index,
                                                    size_t to_index,
                                                    double field_point_x,
                                                    double field_point_y,
                                                    double keep_in_radius) {
  for (size_t bumper = 0; bumper < path_builder.GetBumpers().size(); bumper++) {
    for (size_t i = 0; i < path_builder.GetBumpers().at(bumper).points.size();
         i++) {
      path_builder.SgmtConstraint(
          from_index, to_index,
          trajopt::PointPointMaxConstraint{
              path_builder.GetBumpers().at(bumper).points.at(i),
              {field_point_x, field_point_y},
              keep_in_radius});
    }
  }
}

void SwerveTrajectoryGenerator::sgmt_keep_in_polygon(
    size_t from_index, size_t to_index, rust::Vec<double> field_points_x,
    rust::Vec<double> field_points_y) {
  if (field_points_x.size() != field_points_y.size()) {
    return;
  }
  for (size_t i = 0; i < field_points_x.size(); i++) {
    auto j = (i + 1) % field_points_x.size();
    path_builder.SgmtConstraint(from_index, to_index,
                                trajopt::PointLineRegionConstraint{
                                    {0.0, 0.0},
                                    {field_points_x[i], field_points_y[i]},
                                    {field_points_x[j], field_points_y[j]},
                                    Side::kAbove});
    for (const auto& bumper : path_builder.GetBumpers()) {
      for (const auto& corner : bumper.points) {
        path_builder.SgmtConstraint(from_index, to_index,
                                    trajopt::PointLineRegionConstraint{
                                        corner,
                                        {field_points_x[i], field_points_y[i]},
                                        {field_points_x[j], field_points_y[j]},
                                        Side::kAbove});
      }
    }
  }
}

void SwerveTrajectoryGenerator::sgmt_keep_in_lane(
    size_t from_index, size_t to_index, double center_line_start_x,
    double center_line_start_y, double center_line_end_x,
    double center_line_end_y, double tolerance) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::LaneConstraint{{center_line_start_x, center_line_start_y},
                              {center_line_end_x, center_line_end_y},
                              tolerance});
}

void SwerveTrajectoryGenerator::sgmt_keep_out_circle(size_t from_index,
                                                     size_t to_index, double x,
                                                     double y, double radius) {
  for (size_t bumper = 0; bumper < path_builder.GetBumpers().size(); bumper++) {
    for (size_t i = 0; i < path_builder.GetBumpers().at(bumper).points.size();
         i++) {
      path_builder.SgmtConstraint(
          from_index, to_index,
          trajopt::PointPointMinConstraint{
              path_builder.GetBumpers().at(bumper).points.at(i),
              {x, y},
              radius});
      path_builder.SgmtConstraint(
          from_index, to_index,
          trajopt::LinePointConstraint{
              path_builder.GetBumpers().at(bumper).points.at(i),
              path_builder.GetBumpers().at(bumper).points.at(
                  (i + 1) % path_builder.GetBumpers().at(bumper).points.size()),
              {x, y},
              radius});
    }
  }
}

void SwerveTrajectoryGenerator::add_callback(
    rust::Fn<void(SwerveTrajectory, int64_t)> callback) {
  path_builder.AddCallback([=](trajopt::SwerveSolution& solution,
                               int64_t handle) {
    trajopt::SwerveTrajectory cppTrajectory{solution};

    rust::Vec<SwerveTrajectorySample> rustSamples;
    for (const auto& cppSample : cppTrajectory.samples) {
      rust::Vec<double> fx;
      std::copy(cppSample.moduleForcesX.begin(), cppSample.moduleForcesX.end(),
                std::back_inserter(fx));

      rust::Vec<double> fy;
      std::copy(cppSample.moduleForcesY.begin(), cppSample.moduleForcesY.end(),
                std::back_inserter(fy));

      rustSamples.push_back(SwerveTrajectorySample{
          cppSample.timestamp, cppSample.x, cppSample.y, cppSample.heading,
          cppSample.velocityX, cppSample.velocityY, cppSample.angularVelocity,
          cppSample.accelerationX, cppSample.accelerationY,
          cppSample.angularAcceleration, std::move(fx), std::move(fy)});
    }

    callback(SwerveTrajectory{rustSamples}, handle);
  });
}

SwerveTrajectory SwerveTrajectoryGenerator::generate(bool diagnostics,
                                                     int64_t handle) const {
  trajopt::SwerveTrajectoryGenerator generator{path_builder, handle};
  if (auto sol = generator.Generate(diagnostics); sol.has_value()) {
    trajopt::SwerveTrajectory cppTrajectory{sol.value()};

    rust::Vec<SwerveTrajectorySample> rustSamples;
    for (const auto& cppSample : cppTrajectory.samples) {
      rust::Vec<double> fx;
      std::copy(cppSample.moduleForcesX.begin(), cppSample.moduleForcesX.end(),
                std::back_inserter(fx));

      rust::Vec<double> fy;
      std::copy(cppSample.moduleForcesY.begin(), cppSample.moduleForcesY.end(),
                std::back_inserter(fy));

      rustSamples.push_back(SwerveTrajectorySample{
          cppSample.timestamp, cppSample.x, cppSample.y, cppSample.heading,
          cppSample.velocityX, cppSample.velocityY, cppSample.angularVelocity,
          cppSample.accelerationX, cppSample.accelerationY,
          cppSample.angularAcceleration, std::move(fx), std::move(fy)});
    }

    return SwerveTrajectory{std::move(rustSamples)};
  } else {
    throw sol.error();
  }
}

std::unique_ptr<SwerveTrajectoryGenerator> swerve_trajectory_generator_new() {
  return std::make_unique<SwerveTrajectoryGenerator>();
}

void DifferentialTrajectoryGenerator::set_drivetrain(
    const DifferentialDrivetrain& drivetrain) {
  path_builder.SetDrivetrain(trajopt::DifferentialDrivetrain{
      drivetrain.mass, drivetrain.moi, drivetrain.wheel_radius,
      drivetrain.wheel_max_angular_velocity, drivetrain.wheel_max_torque,
      drivetrain.trackwidth});
}

void DifferentialTrajectoryGenerator::set_bumpers(double front, double left,
                                                  double right, double back) {
  path_builder.SetBumpers(front, left, right, back);
}

void DifferentialTrajectoryGenerator::set_control_interval_counts(
    const rust::Vec<size_t> counts) {
  std::vector<size_t> cppCounts;
  for (const auto& count : counts) {
    cppCounts.emplace_back(count);
  }

  path_builder.SetControlIntervalCounts(std::move(cppCounts));
}

void DifferentialTrajectoryGenerator::sgmt_initial_guess_points(
    size_t from_index, const rust::Vec<Pose2d>& guess_points) {
  std::vector<trajopt::Pose2d> cppGuessPoints;
  for (const auto& guess_point : guess_points) {
    cppGuessPoints.emplace_back(guess_point.x, guess_point.y,
                                guess_point.heading);
  }

  path_builder.SgmtInitialGuessPoints(from_index, std::move(cppGuessPoints));
}

void DifferentialTrajectoryGenerator::pose_wpt(size_t index, double x, double y,
                                               double heading) {
  path_builder.PoseWpt(index, x, y, heading);
}

void DifferentialTrajectoryGenerator::translation_wpt(size_t index, double x,
                                                      double y,
                                                      double heading_guess) {
  path_builder.TranslationWpt(index, x, y, heading_guess);
}

void DifferentialTrajectoryGenerator::empty_wpt(size_t index, double x_guess,
                                                double y_guess,
                                                double heading_guess) {
  path_builder.WptInitialGuessPoint(index, {x_guess, y_guess, heading_guess});
}

void DifferentialTrajectoryGenerator::wpt_linear_velocity_direction(
    size_t index, double angle) {
  path_builder.WptConstraint(index,
                             trajopt::LinearVelocityDirectionConstraint{angle});
}

void DifferentialTrajectoryGenerator::wpt_linear_velocity_max_magnitude(
    size_t index, double magnitude) {
  path_builder.WptConstraint(
      index, trajopt::LinearVelocityMaxMagnitudeConstraint{magnitude});
}

void DifferentialTrajectoryGenerator::wpt_angular_velocity_max_magnitude(
    size_t index, double angular_velocity) {
  path_builder.WptConstraint(
      index, trajopt::AngularVelocityMaxMagnitudeConstraint{angular_velocity});
}

void DifferentialTrajectoryGenerator::wpt_linear_acceleration_max_magnitude(
    size_t index, double magnitude) {
  path_builder.WptConstraint(
      index, trajopt::LinearAccelerationMaxMagnitudeConstraint{magnitude});
}

void DifferentialTrajectoryGenerator::wpt_point_at(size_t index,
                                                   double field_point_x,
                                                   double field_point_y,
                                                   double heading_tolerance,
                                                   bool flip) {
  path_builder.WptConstraint(
      index, trajopt::PointAtConstraint{
                 trajopt::Translation2d{field_point_x, field_point_y},
                 heading_tolerance, flip});
}

void DifferentialTrajectoryGenerator::wpt_keep_in_circle(
    size_t index, double field_point_x, double field_point_y,
    double keep_in_radius) {
  for (size_t bumper = 0; bumper < path_builder.GetBumpers().size(); bumper++) {
    for (size_t i = 0; i < path_builder.GetBumpers().at(bumper).points.size();
         i++) {
      path_builder.WptConstraint(
          index, trajopt::PointPointMaxConstraint{
                     path_builder.GetBumpers().at(bumper).points.at(i),
                     {field_point_x, field_point_y},
                     keep_in_radius});
    }
  }
  path_builder.WptConstraint(
      index, trajopt::PointPointMaxConstraint{
                 {0.0, 0.0}, {field_point_x, field_point_y}, keep_in_radius});
}

void DifferentialTrajectoryGenerator::wpt_keep_in_polygon(
    size_t index, rust::Vec<double> field_points_x,
    rust::Vec<double> field_points_y) {
  if (field_points_x.size() != field_points_y.size()) {
    return;
  }
  for (size_t i = 0; i < field_points_x.size(); i++) {
    auto j = (i + 1) % field_points_x.size();
    path_builder.WptConstraint(index,
                               trajopt::PointLineRegionConstraint{
                                   {0.0, 0.0},
                                   {field_points_x[i], field_points_y[i]},
                                   {field_points_x[j], field_points_y[j]},
                                   Side::kAbove});
    for (const auto& bumper : path_builder.GetBumpers()) {
      for (const auto& corner : bumper.points) {
        path_builder.WptConstraint(index,
                                   trajopt::PointLineRegionConstraint{
                                       corner,
                                       {field_points_x[i], field_points_y[i]},
                                       {field_points_x[j], field_points_y[j]},
                                       Side::kAbove});
      }
    }
  }
}

void DifferentialTrajectoryGenerator::wpt_keep_in_lane(
    size_t index, double center_line_start_x, double center_line_start_y,
    double center_line_end_x, double center_line_end_y, double tolerance) {
  path_builder.WptConstraint(
      index, trajopt::LaneConstraint{{center_line_start_x, center_line_start_y},
                                     {center_line_end_x, center_line_end_y},
                                     tolerance});
}

void DifferentialTrajectoryGenerator::wpt_keep_out_circle(size_t index,
                                                          double x, double y,
                                                          double radius) {
  for (size_t bumper = 0; bumper < path_builder.GetBumpers().size(); bumper++) {
    for (size_t i = 0; i < path_builder.GetBumpers().at(bumper).points.size();
         i++) {
      path_builder.WptConstraint(
          index, trajopt::PointPointMinConstraint{
                     path_builder.GetBumpers().at(bumper).points.at(i),
                     {x, y},
                     radius});
      path_builder.WptConstraint(
          index,
          trajopt::LinePointConstraint{
              path_builder.GetBumpers().at(bumper).points.at(i),
              path_builder.GetBumpers().at(bumper).points.at(
                  (i + 1) % path_builder.GetBumpers().at(bumper).points.size()),
              {x, y},
              radius});
    }
  }
}

void DifferentialTrajectoryGenerator::sgmt_linear_velocity_direction(
    size_t from_index, size_t to_index, double angle) {
  path_builder.SgmtConstraint(
      from_index, to_index, trajopt::LinearVelocityDirectionConstraint{angle});
}

void DifferentialTrajectoryGenerator::sgmt_linear_velocity_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::LinearVelocityMaxMagnitudeConstraint{magnitude});
}

void DifferentialTrajectoryGenerator::sgmt_angular_velocity_max_magnitude(
    size_t from_index, size_t to_index, double angular_velocity) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::AngularVelocityMaxMagnitudeConstraint{angular_velocity});
}

void DifferentialTrajectoryGenerator::sgmt_linear_acceleration_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::LinearAccelerationMaxMagnitudeConstraint{magnitude});
}

void DifferentialTrajectoryGenerator::sgmt_keep_in_circle(
    size_t from_index, size_t to_index, double field_point_x,
    double field_point_y, double keep_in_radius) {
  for (size_t bumper = 0; bumper < path_builder.GetBumpers().size(); bumper++) {
    for (size_t i = 0; i < path_builder.GetBumpers().at(bumper).points.size();
         i++) {
      path_builder.SgmtConstraint(
          from_index, to_index,
          trajopt::PointPointMaxConstraint{
              path_builder.GetBumpers().at(bumper).points.at(i),
              {field_point_x, field_point_y},
              keep_in_radius});
    }
  }
}

void DifferentialTrajectoryGenerator::sgmt_keep_in_polygon(
    size_t from_index, size_t to_index, rust::Vec<double> field_points_x,
    rust::Vec<double> field_points_y) {
  if (field_points_x.size() != field_points_y.size()) {
    return;
  }
  for (size_t i = 0; i < field_points_x.size(); i++) {
    auto j = (i + 1) % field_points_x.size();
    path_builder.SgmtConstraint(from_index, to_index,
                                trajopt::PointLineRegionConstraint{
                                    {0.0, 0.0},
                                    {field_points_x[i], field_points_y[i]},
                                    {field_points_x[j], field_points_y[j]},
                                    Side::kAbove});
    for (const auto& bumper : path_builder.GetBumpers()) {
      for (const auto& corner : bumper.points) {
        path_builder.SgmtConstraint(from_index, to_index,
                                    trajopt::PointLineRegionConstraint{
                                        corner,
                                        {field_points_x[i], field_points_y[i]},
                                        {field_points_x[j], field_points_y[j]},
                                        Side::kAbove});
      }
    }
  }
}

void DifferentialTrajectoryGenerator::sgmt_keep_in_lane(
    size_t from_index, size_t to_index, double center_line_start_x,
    double center_line_start_y, double center_line_end_x,
    double center_line_end_y, double tolerance) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::LaneConstraint{{center_line_start_x, center_line_start_y},
                              {center_line_end_x, center_line_end_y},
                              tolerance});
}

void DifferentialTrajectoryGenerator::sgmt_keep_out_circle(size_t from_index,
                                                           size_t to_index,
                                                           double x, double y,
                                                           double radius) {
  for (size_t bumper = 0; bumper < path_builder.GetBumpers().size(); bumper++) {
    for (size_t i = 0; i < path_builder.GetBumpers().at(bumper).points.size();
         i++) {
      path_builder.SgmtConstraint(
          from_index, to_index,
          trajopt::PointPointMinConstraint{
              path_builder.GetBumpers().at(bumper).points.at(i),
              {x, y},
              radius});
      path_builder.SgmtConstraint(
          from_index, to_index,
          trajopt::LinePointConstraint{
              path_builder.GetBumpers().at(bumper).points.at(i),
              path_builder.GetBumpers().at(bumper).points.at(
                  (i + 1) % path_builder.GetBumpers().at(bumper).points.size()),
              {x, y},
              radius});
    }
  }
}

void DifferentialTrajectoryGenerator::add_callback(
    rust::Fn<void(DifferentialTrajectory, int64_t)> callback) {
  path_builder.AddCallback(
      [=](trajopt::DifferentialSolution& solution, int64_t handle) {
        trajopt::DifferentialTrajectory cppTrajectory{solution};

        rust::Vec<DifferentialTrajectorySample> rustSamples;
        for (const auto& cppSample : cppTrajectory.samples) {
          rustSamples.push_back(DifferentialTrajectorySample{
              cppSample.timestamp, cppSample.x, cppSample.y, cppSample.heading,
              cppSample.velocityL, cppSample.velocityR, cppSample.accelerationL,
              cppSample.accelerationR, cppSample.forceL, cppSample.forceR});
        }

        callback(DifferentialTrajectory{rustSamples}, handle);
      });
}

DifferentialTrajectory DifferentialTrajectoryGenerator::generate(
    bool diagnostics, int64_t handle) const {
  trajopt::DifferentialTrajectoryGenerator generator{path_builder, handle};
  if (auto sol = generator.Generate(diagnostics); sol.has_value()) {
    trajopt::DifferentialTrajectory cppTrajectory{sol.value()};

    rust::Vec<DifferentialTrajectorySample> rustSamples;
    for (const auto& cppSample : cppTrajectory.samples) {
      rustSamples.push_back(DifferentialTrajectorySample{
          cppSample.timestamp, cppSample.x, cppSample.y, cppSample.heading,
          cppSample.velocityL, cppSample.velocityR, cppSample.accelerationL,
          cppSample.accelerationR, cppSample.forceL, cppSample.forceR});
    }

    return DifferentialTrajectory{std::move(rustSamples)};
  } else {
    throw sol.error();
  }
}

std::unique_ptr<DifferentialTrajectoryGenerator>
differential_trajectory_generator_new() {
  return std::make_unique<DifferentialTrajectoryGenerator>();
}

void cancel_all() {
  trajopt::GetCancellationFlag() = 1;
}

}  // namespace trajopt::rsffi
