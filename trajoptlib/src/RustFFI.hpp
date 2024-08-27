// Copyright (c) TrajoptLib contributors

#pragma once

#include <cstddef>
#include <memory>

#include <rust/cxx.h>

#include "trajopt/DifferentialTrajectoryGenerator.hpp"
#include "trajopt/SwerveTrajectoryGenerator.hpp"

namespace trajopt::rsffi {

struct SwerveTrajectory;
struct DifferentialTrajectory;
struct Pose2d;
struct SwerveDrivetrain;
struct DifferentialDrivetrain;

class SwervePathBuilder {
 public:
  SwervePathBuilder() = default;

  void set_drivetrain(const SwerveDrivetrain& drivetrain);
  void set_bumpers(double length, double width);
  void set_control_interval_counts(const rust::Vec<size_t> counts);

  void pose_wpt(size_t index, double x, double y, double heading);
  void translation_wpt(size_t index, double x, double y, double heading_guess);
  void empty_wpt(size_t index, double x_guess, double y_guess,
                 double heading_guess);

  void sgmt_initial_guess_points(size_t from_index,
                                 const rust::Vec<Pose2d>& guess_points);

  void wpt_linear_velocity_direction(size_t index, double angle);
  void wpt_linear_velocity_max_magnitude(size_t index, double magnitude);
  void wpt_angular_velocity_max_magnitude(size_t index,
                                          double angular_velocity);
  void wpt_linear_acceleration_max_magnitude(size_t index, double magnitude);
  void wpt_point_at(size_t index, double field_point_x, double field_point_y,
                    double heading_tolerance, bool flip);

  void sgmt_linear_velocity_direction(size_t from_index, size_t to_index,
                                      double angle);
  void sgmt_linear_velocity_max_magnitude(size_t from_index, size_t to_index,
                                          double magnitude);
  void sgmt_angular_velocity_max_magnitude(size_t from_index, size_t to_index,
                                           double angular_velocity);
  void sgmt_linear_acceleration_max_magnitude(size_t from_index,
                                              size_t to_index,
                                              double magnitude);
  void sgmt_point_at(size_t from_index, size_t to_index, double field_point_x,
                     double field_point_y, double heading_tolerance, bool flip);

  void sgmt_circle_obstacle(size_t from_index, size_t to_index, double x,
                            double y, double radius);
  void sgmt_polygon_obstacle(size_t from_index, size_t to_index,
                             rust::Vec<double> x, rust::Vec<double> y,
                             double radius);

  // TODO: Return std::expected<SwerveTrajectory, std::string> instead of
  // throwing exception, once cxx supports it
  SwerveTrajectory generate(bool diagnostics = false, int64_t handle = 0) const;

  void add_progress_callback(
      rust::Fn<void(SwerveTrajectory, int64_t)> callback);

 private:
  trajopt::SwervePathBuilder path_builder;
};

class DifferentialPathBuilder {
 public:
  DifferentialPathBuilder() = default;

  void set_drivetrain(const DifferentialDrivetrain& drivetrain);
  void set_bumpers(double length, double width);
  void set_control_interval_counts(const rust::Vec<size_t> counts);

  void pose_wpt(size_t index, double x, double y, double heading);
  void translation_wpt(size_t index, double x, double y, double heading_guess);
  void empty_wpt(size_t index, double x_guess, double y_guess,
                 double heading_guess);

  void sgmt_initial_guess_points(size_t from_index,
                                 const rust::Vec<Pose2d>& guess_points);

  void wpt_linear_velocity_direction(size_t index, double angle);
  void wpt_linear_velocity_max_magnitude(size_t index, double magnitude);
  void wpt_angular_velocity_max_magnitude(size_t index,
                                          double angular_velocity);
  void wpt_linear_acceleration_max_magnitude(size_t index, double magnitude);
  void wpt_point_at(size_t index, double field_point_x, double field_point_y,
                    double heading_tolerance, bool flip);

  void sgmt_linear_velocity_direction(size_t from_index, size_t to_index,
                                      double angle);
  void sgmt_linear_velocity_max_magnitude(size_t from_index, size_t to_index,
                                          double magnitude);
  void sgmt_angular_velocity_max_magnitude(size_t from_index, size_t to_index,
                                           double angular_velocity);
  void sgmt_linear_acceleration_max_magnitude(size_t from_index,
                                              size_t to_index,
                                              double magnitude);

  void sgmt_circle_obstacle(size_t from_index, size_t to_index, double x,
                            double y, double radius);
  void sgmt_polygon_obstacle(size_t from_index, size_t to_index,
                             rust::Vec<double> x, rust::Vec<double> y,
                             double radius);

  // TODO: Return std::expected<DifferentialTrajectory, std::string> instead of
  // throwing exception, once cxx supports it
  DifferentialTrajectory generate(bool diagnostics = false,
                                  int64_t handle = 0) const;

  void add_progress_callback(
      rust::Fn<void(DifferentialTrajectory, int64_t)> callback);

 private:
  trajopt::DifferentialPathBuilder path_builder;
};

std::unique_ptr<SwervePathBuilder> swerve_path_builder_new();

std::unique_ptr<DifferentialPathBuilder> differential_path_builder_new();

void cancel_all();

}  // namespace trajopt::rsffi
