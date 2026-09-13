// Copyright (c) TrajoptLib contributors

#include "rust_ffi.hpp"

#include <stdint.h>

#include <algorithm>
#include <cstddef>
#include <memory>
#include <utility>
#include <vector>

#include "trajopt/differential_trajectory_generator.hpp"
#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/swerve_trajectory_generator.hpp"
#include "trajopt/util/cancellation.hpp"
#include "trajoptlib/src/lib.rs.h"

namespace trajopt::rsffi {

void SwerveTrajectoryGenerator::set_drivetrain(
    const SwerveDrivetrain& drivetrain) {
  std::vector<trajopt::Translation2d> cpp_modules;
  for (const auto& module : drivetrain.modules) {
    cpp_modules.emplace_back(module.x, module.y);
  }

  path_builder.set_drivetrain(trajopt::SwerveDrivetrain{
      drivetrain.mass, drivetrain.moi, drivetrain.wheel_radius,
      drivetrain.wheel_max_angular_velocity, drivetrain.wheel_max_torque,
      drivetrain.wheel_cof, std::move(cpp_modules)});
}

void SwerveTrajectoryGenerator::set_bumpers(double front, double left,
                                            double right, double back) {
  path_builder.set_bumpers(front, left, right, back);
}

void SwerveTrajectoryGenerator::set_control_interval_counts(
    const rust::Vec<size_t> counts) {
  std::vector<size_t> cpp_counts;
  for (const auto& count : counts) {
    cpp_counts.emplace_back(count);
  }

  path_builder.set_control_interval_counts(std::move(cpp_counts));
}

void SwerveTrajectoryGenerator::sgmt_initial_guess_points(
    size_t from_index, const rust::Vec<Pose2d>& guess_points) {
  std::vector<trajopt::Pose2d> cpp_guess_points;
  for (const auto& guess_point : guess_points) {
    cpp_guess_points.emplace_back(guess_point.x, guess_point.y,
                                  guess_point.heading);
  }

  path_builder.sgmt_initial_guess_points(from_index,
                                         std::move(cpp_guess_points));
}

void SwerveTrajectoryGenerator::pose_wpt(size_t index, double x, double y,
                                         double heading) {
  path_builder.pose_wpt(index, x, y, heading);
}

void SwerveTrajectoryGenerator::translation_wpt(size_t index, double x,
                                                double y,
                                                double heading_guess) {
  path_builder.translation_wpt(index, x, y, heading_guess);
}

void SwerveTrajectoryGenerator::empty_wpt(size_t index, double x_guess,
                                          double y_guess,
                                          double heading_guess) {
  path_builder.empty_wpt(index, {x_guess, y_guess, heading_guess});
}

void SwerveTrajectoryGenerator::wpt_linear_velocity_direction(size_t index,
                                                              double angle) {
  path_builder.wpt_linear_velocity_direction(index, angle);
}

void SwerveTrajectoryGenerator::wpt_linear_velocity_max_magnitude(
    size_t index, double magnitude) {
  path_builder.wpt_linear_velocity_max_magnitude(index, magnitude);
}

void SwerveTrajectoryGenerator::wpt_angular_velocity_max_magnitude(
    size_t index, double magnitude) {
  path_builder.wpt_angular_velocity_max_magnitude(index, magnitude);
}

void SwerveTrajectoryGenerator::wpt_linear_acceleration_max_magnitude(
    size_t index, double magnitude) {
  path_builder.wpt_linear_acceleration_max_magnitude(index, magnitude);
}

void SwerveTrajectoryGenerator::wpt_point_at(size_t index, double field_point_x,
                                             double field_point_y,
                                             double heading_tolerance,
                                             bool flip) {
  path_builder.wpt_point_at(index, {field_point_x, field_point_y},
                            heading_tolerance, flip);
}

void SwerveTrajectoryGenerator::wpt_keep_in_circle(size_t index,
                                                   double center_x,
                                                   double center_y,
                                                   double radius) {
  path_builder.wpt_keep_in_circle(index, {center_x, center_y}, radius);
}

void SwerveTrajectoryGenerator::wpt_keep_in_polygon(
    size_t index, rust::Vec<double> field_points_x,
    rust::Vec<double> field_points_y) {
  if (field_points_x.size() != field_points_y.size()) {
    return;
  }

  std::vector<trajopt::Translation2d> field_points;
  for (size_t i = 0; i < field_points_x.size(); ++i) {
    field_points.emplace_back(field_points_x[i], field_points_y[i]);
  }
  path_builder.wpt_keep_in_polygon(index, field_points);
}

void SwerveTrajectoryGenerator::wpt_keep_in_lane(
    size_t index, double center_line_start_x, double center_line_start_y,
    double center_line_end_x, double center_line_end_y, double tolerance) {
  path_builder.wpt_keep_in_lane(
      index, {center_line_start_x, center_line_start_y},
      {center_line_end_x, center_line_end_y}, tolerance);
}

void SwerveTrajectoryGenerator::wpt_keep_out_circle(size_t index,
                                                    double center_x,
                                                    double center_y,
                                                    double radius) {
  path_builder.wpt_keep_out_circle(index, {center_x, center_y}, radius);
}

void SwerveTrajectoryGenerator::sgmt_linear_velocity_direction(
    size_t from_index, size_t to_index, double angle) {
  path_builder.sgmt_linear_velocity_direction(from_index, to_index, angle);
}

void SwerveTrajectoryGenerator::sgmt_linear_velocity_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.sgmt_linear_velocity_max_magnitude(from_index, to_index,
                                                  magnitude);
}

void SwerveTrajectoryGenerator::sgmt_angular_velocity_max_magnitude(
    size_t from_index, size_t to_index, double angular_velocity) {
  path_builder.sgmt_angular_velocity_max_magnitude(from_index, to_index,
                                                   angular_velocity);
}

void SwerveTrajectoryGenerator::sgmt_linear_acceleration_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.sgmt_linear_acceleration_max_magnitude(from_index, to_index,
                                                      magnitude);
}

void SwerveTrajectoryGenerator::sgmt_point_at(
    size_t from_index, size_t to_index, double field_point_x,
    double field_point_y, double heading_tolerance, bool flip) {
  path_builder.sgmt_point_at(from_index, to_index,
                             {field_point_x, field_point_y}, heading_tolerance,
                             flip);
}

void SwerveTrajectoryGenerator::sgmt_keep_in_circle(size_t from_index,
                                                    size_t to_index,
                                                    double center_x,
                                                    double center_y,
                                                    double radius) {
  path_builder.sgmt_keep_in_circle(from_index, to_index, {center_x, center_y},
                                   radius);
}

void SwerveTrajectoryGenerator::sgmt_keep_in_polygon(
    size_t from_index, size_t to_index, rust::Vec<double> field_points_x,
    rust::Vec<double> field_points_y) {
  if (field_points_x.size() != field_points_y.size()) {
    return;
  }

  std::vector<trajopt::Translation2d> field_points;
  for (size_t i = 0; i < field_points_x.size(); ++i) {
    field_points.emplace_back(field_points_x[i], field_points_y[i]);
  }
  path_builder.sgmt_keep_in_polygon(from_index, to_index, field_points);
}

void SwerveTrajectoryGenerator::sgmt_keep_in_lane(
    size_t from_index, size_t to_index, double center_line_start_x,
    double center_line_start_y, double center_line_end_x,
    double center_line_end_y, double tolerance) {
  path_builder.sgmt_keep_in_lane(
      from_index, to_index, {center_line_start_x, center_line_start_y},
      {center_line_end_x, center_line_end_y}, tolerance);
}

void SwerveTrajectoryGenerator::sgmt_keep_out_circle(size_t from_index,
                                                     size_t to_index,
                                                     double center_x,
                                                     double center_y,
                                                     double radius) {
  path_builder.sgmt_keep_out_circle(from_index, to_index, {center_x, center_y},
                                    radius);
}

void SwerveTrajectoryGenerator::add_callback(
    rust::Fn<void(SwerveTrajectory, int64_t)> callback) {
  path_builder.add_callback(
      [=](const trajopt::SwerveSolution& solution, int64_t handle) {
        trajopt::SwerveTrajectory cpp_trajectory{solution};

        rust::Vec<SwerveTrajectorySample> rust_samples;
        for (const auto& cpp_sample : cpp_trajectory.samples) {
          rust::Vec<double> fx;
          std::copy(cpp_sample.module_forces_x.begin(),
                    cpp_sample.module_forces_x.end(), std::back_inserter(fx));

          rust::Vec<double> fy;
          std::copy(cpp_sample.module_forces_y.begin(),
                    cpp_sample.module_forces_y.end(), std::back_inserter(fy));

          rust_samples.push_back(SwerveTrajectorySample{
              cpp_sample.timestamp, cpp_sample.x, cpp_sample.y,
              cpp_sample.heading, cpp_sample.velocity_x, cpp_sample.velocity_y,
              cpp_sample.angular_velocity, cpp_sample.acceleration_x,
              cpp_sample.acceleration_y, cpp_sample.angular_acceleration,
              std::move(fx), std::move(fy)});
        }

        callback(SwerveTrajectory{rust_samples}, handle);
      });
}

SwerveTrajectory SwerveTrajectoryGenerator::generate(bool diagnostics,
                                                     int64_t handle) const {
  trajopt::SwerveTrajectoryGenerator generator{path_builder, handle};
  if (auto sol = generator.generate(diagnostics); sol.has_value()) {
    trajopt::SwerveTrajectory cpp_trajectory{sol.value()};

    rust::Vec<SwerveTrajectorySample> rust_samples;
    for (const auto& cpp_sample : cpp_trajectory.samples) {
      rust::Vec<double> fx;
      std::copy(cpp_sample.module_forces_x.begin(),
                cpp_sample.module_forces_x.end(), std::back_inserter(fx));

      rust::Vec<double> fy;
      std::copy(cpp_sample.module_forces_y.begin(),
                cpp_sample.module_forces_y.end(), std::back_inserter(fy));

      rust_samples.push_back(SwerveTrajectorySample{
          cpp_sample.timestamp, cpp_sample.x, cpp_sample.y, cpp_sample.heading,
          cpp_sample.velocity_x, cpp_sample.velocity_y,
          cpp_sample.angular_velocity, cpp_sample.acceleration_x,
          cpp_sample.acceleration_y, cpp_sample.angular_acceleration,
          std::move(fx), std::move(fy)});
    }

    return SwerveTrajectory{std::move(rust_samples)};
  } else {
    throw sol.error();
  }
}

std::unique_ptr<SwerveTrajectoryGenerator> swerve_trajectory_generator_new() {
  return std::make_unique<SwerveTrajectoryGenerator>();
}

void DifferentialTrajectoryGenerator::set_drivetrain(
    const DifferentialDrivetrain& drivetrain) {
  path_builder.set_drivetrain(trajopt::DifferentialDrivetrain{
      drivetrain.mass, drivetrain.moi, drivetrain.wheel_radius,
      drivetrain.wheel_max_angular_velocity, drivetrain.wheel_max_torque,
      drivetrain.wheel_cof, drivetrain.trackwidth});
}

void DifferentialTrajectoryGenerator::set_bumpers(double front, double left,
                                                  double right, double back) {
  path_builder.set_bumpers(front, left, right, back);
}

void DifferentialTrajectoryGenerator::set_control_interval_counts(
    const rust::Vec<size_t> counts) {
  std::vector<size_t> cpp_counts;
  for (const auto& count : counts) {
    cpp_counts.emplace_back(count);
  }

  path_builder.set_control_interval_counts(std::move(cpp_counts));
}

void DifferentialTrajectoryGenerator::sgmt_initial_guess_points(
    size_t from_index, const rust::Vec<Pose2d>& guess_points) {
  std::vector<trajopt::Pose2d> cpp_guess_points;
  for (const auto& guess_point : guess_points) {
    cpp_guess_points.emplace_back(guess_point.x, guess_point.y,
                                  guess_point.heading);
  }

  path_builder.sgmt_initial_guess_points(from_index,
                                         std::move(cpp_guess_points));
}

void DifferentialTrajectoryGenerator::pose_wpt(size_t index, double x, double y,
                                               double heading) {
  path_builder.pose_wpt(index, x, y, heading);
}

void DifferentialTrajectoryGenerator::translation_wpt(size_t index, double x,
                                                      double y,
                                                      double heading_guess) {
  path_builder.translation_wpt(index, x, y, heading_guess);
}

void DifferentialTrajectoryGenerator::empty_wpt(size_t index, double x_guess,
                                                double y_guess,
                                                double heading_guess) {
  path_builder.empty_wpt(index, {x_guess, y_guess, heading_guess});
}

void DifferentialTrajectoryGenerator::wpt_linear_velocity_direction(
    size_t index, double angle) {
  path_builder.wpt_linear_velocity_direction(index, angle);
}

void DifferentialTrajectoryGenerator::wpt_linear_velocity_max_magnitude(
    size_t index, double magnitude) {
  path_builder.wpt_linear_velocity_max_magnitude(index, magnitude);
}

void DifferentialTrajectoryGenerator::wpt_angular_velocity_max_magnitude(
    size_t index, double magnitude) {
  path_builder.wpt_angular_velocity_max_magnitude(index, magnitude);
}

void DifferentialTrajectoryGenerator::wpt_linear_acceleration_max_magnitude(
    size_t index, double magnitude) {
  path_builder.wpt_linear_acceleration_max_magnitude(index, magnitude);
}

void DifferentialTrajectoryGenerator::wpt_point_at(size_t index,
                                                   double field_point_x,
                                                   double field_point_y,
                                                   double heading_tolerance,
                                                   bool flip) {
  path_builder.wpt_point_at(index, {field_point_x, field_point_y},
                            heading_tolerance, flip);
}

void DifferentialTrajectoryGenerator::wpt_keep_in_circle(size_t index,
                                                         double center_x,
                                                         double center_y,
                                                         double radius) {
  path_builder.wpt_keep_in_circle(index, {center_x, center_y}, radius);
}

void DifferentialTrajectoryGenerator::wpt_keep_in_polygon(
    size_t index, rust::Vec<double> field_points_x,
    rust::Vec<double> field_points_y) {
  if (field_points_x.size() != field_points_y.size()) {
    return;
  }

  std::vector<trajopt::Translation2d> field_points;
  for (size_t i = 0; i < field_points_x.size(); ++i) {
    field_points.emplace_back(field_points_x[i], field_points_y[i]);
  }
  path_builder.wpt_keep_in_polygon(index, field_points);
}

void DifferentialTrajectoryGenerator::wpt_keep_in_lane(
    size_t index, double center_line_start_x, double center_line_start_y,
    double center_line_end_x, double center_line_end_y, double tolerance) {
  path_builder.wpt_keep_in_lane(
      index, {center_line_start_x, center_line_start_y},
      {center_line_end_x, center_line_end_y}, tolerance);
}

void DifferentialTrajectoryGenerator::wpt_keep_out_circle(size_t index,
                                                          double center_x,
                                                          double center_y,
                                                          double radius) {
  path_builder.wpt_keep_out_circle(index, {center_x, center_y}, radius);
}

void DifferentialTrajectoryGenerator::sgmt_linear_velocity_direction(
    size_t from_index, size_t to_index, double angle) {
  path_builder.sgmt_linear_velocity_direction(from_index, to_index, angle);
}

void DifferentialTrajectoryGenerator::sgmt_linear_velocity_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.sgmt_linear_velocity_max_magnitude(from_index, to_index,
                                                  magnitude);
}

void DifferentialTrajectoryGenerator::sgmt_angular_velocity_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.sgmt_angular_velocity_max_magnitude(from_index, to_index,
                                                   magnitude);
}

void DifferentialTrajectoryGenerator::sgmt_linear_acceleration_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.sgmt_linear_acceleration_max_magnitude(from_index, to_index,
                                                      magnitude);
}

void DifferentialTrajectoryGenerator::sgmt_keep_in_circle(size_t from_index,
                                                          size_t to_index,
                                                          double center_x,
                                                          double center_y,
                                                          double radius) {
  path_builder.sgmt_keep_in_circle(from_index, to_index, {center_x, center_y},
                                   radius);
}

void DifferentialTrajectoryGenerator::sgmt_keep_in_polygon(
    size_t from_index, size_t to_index, rust::Vec<double> field_points_x,
    rust::Vec<double> field_points_y) {
  if (field_points_x.size() != field_points_y.size()) {
    return;
  }

  std::vector<trajopt::Translation2d> field_points;
  for (size_t i = 0; i < field_points_x.size(); ++i) {
    field_points.emplace_back(field_points_x[i], field_points_y[i]);
  }
  path_builder.sgmt_keep_in_polygon(from_index, to_index, field_points);
}

void DifferentialTrajectoryGenerator::sgmt_keep_in_lane(
    size_t from_index, size_t to_index, double center_line_start_x,
    double center_line_start_y, double center_line_end_x,
    double center_line_end_y, double tolerance) {
  path_builder.sgmt_keep_in_lane(
      from_index, to_index, {center_line_start_x, center_line_start_y},
      {center_line_end_x, center_line_end_y}, tolerance);
}

void DifferentialTrajectoryGenerator::sgmt_keep_out_circle(size_t from_index,
                                                           size_t to_index,
                                                           double center_x,
                                                           double center_y,
                                                           double radius) {
  path_builder.sgmt_keep_out_circle(from_index, to_index, {center_x, center_y},
                                    radius);
}

void DifferentialTrajectoryGenerator::add_callback(
    rust::Fn<void(DifferentialTrajectory, int64_t)> callback) {
  path_builder.add_callback([=](const trajopt::DifferentialSolution& solution,
                                int64_t handle) {
    trajopt::DifferentialTrajectory cpp_trajectory{solution};

    rust::Vec<DifferentialTrajectorySample> rust_samples;
    for (const auto& cpp_sample : cpp_trajectory.samples) {
      rust_samples.push_back(DifferentialTrajectorySample{
          cpp_sample.timestamp, cpp_sample.x, cpp_sample.y, cpp_sample.heading,
          cpp_sample.velocity_l, cpp_sample.velocity_r,
          cpp_sample.angular_velocity, cpp_sample.acceleration_l,
          cpp_sample.acceleration_r, cpp_sample.force_l, cpp_sample.force_r});
    }

    callback(DifferentialTrajectory{rust_samples}, handle);
  });
}

DifferentialTrajectory DifferentialTrajectoryGenerator::generate(
    bool diagnostics, int64_t handle) const {
  trajopt::DifferentialTrajectoryGenerator generator{path_builder, handle};
  if (auto sol = generator.generate(diagnostics); sol.has_value()) {
    trajopt::DifferentialTrajectory cpp_trajectory{sol.value()};

    rust::Vec<DifferentialTrajectorySample> rust_samples;
    for (const auto& cpp_sample : cpp_trajectory.samples) {
      rust_samples.push_back(DifferentialTrajectorySample{
          cpp_sample.timestamp, cpp_sample.x, cpp_sample.y, cpp_sample.heading,
          cpp_sample.velocity_l, cpp_sample.velocity_r,
          cpp_sample.angular_velocity, cpp_sample.acceleration_l,
          cpp_sample.acceleration_r, cpp_sample.force_l, cpp_sample.force_r});
    }

    return DifferentialTrajectory{std::move(rust_samples)};
  } else {
    throw sol.error();
  }
}

std::unique_ptr<DifferentialTrajectoryGenerator>
differential_trajectory_generator_new() {
  return std::make_unique<DifferentialTrajectoryGenerator>();
}

void cancel_all() {
  trajopt::get_cancellation_flag() = 1;
}

}  // namespace trajopt::rsffi
