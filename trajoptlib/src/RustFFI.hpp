// Copyright (c) TrajoptLib contributors

#pragma once

#include <cstddef>
#include <memory>
#include <string>
#include <type_traits>

#include <rust/cxx.h>
#include <sleipnir/optimization/SolverExitCondition.hpp>

#include "trajopt/DifferentialTrajectoryGenerator.hpp"
#include "trajopt/SwerveTrajectoryGenerator.hpp"

// override cxx try/catch so it catches thrown integers/exit conditions
namespace rust::behavior {
template <typename Try, typename Fail>
static void trycatch(Try&& func, Fail&& fail) noexcept try {
  func();
} catch (const std::exception& e) {
  fail(e.what());
} catch (const sleipnir::SolverExitCondition& e) {
  // TODO: Use std::to_underlying() from C++23
  // numerical value of the enum, converted to string
  fail(std::to_string(
      static_cast<std::underlying_type_t<sleipnir::SolverExitCondition>>(e)));
}
}  // namespace rust::behavior

namespace trajopt::rsffi {

struct SwerveTrajectory;
struct DifferentialTrajectory;
struct Pose2d;
struct SwerveDrivetrain;
struct DifferentialDrivetrain;

class SwerveTrajectoryGenerator {
 public:
  SwerveTrajectoryGenerator() = default;

  void set_drivetrain(const SwerveDrivetrain& drivetrain);
  void set_bumpers(double front, double left, double right, double back);
  void set_control_interval_counts(const rust::Vec<size_t> counts);
  void sgmt_initial_guess_points(size_t from_index,
                                 const rust::Vec<Pose2d>& guess_points);

  void pose_wpt(size_t index, double x, double y, double heading);
  void translation_wpt(size_t index, double x, double y, double heading_guess);
  void empty_wpt(size_t index, double x_guess, double y_guess,
                 double heading_guess);

  void wpt_linear_velocity_direction(size_t index, double angle);
  void wpt_linear_velocity_max_magnitude(size_t index, double magnitude);
  void wpt_angular_velocity_max_magnitude(size_t index,
                                          double angular_velocity);
  void wpt_linear_acceleration_max_magnitude(size_t index, double magnitude);
  void wpt_point_at(size_t index, double field_point_x, double field_point_y,
                    double heading_tolerance, bool flip);
  void wpt_keep_in_circle(size_t index, double field_point_x,
                          double field_point_y, double keep_in_radius);
  void wpt_keep_in_polygon(size_t index, rust::Vec<double> field_points_x,
                           rust::Vec<double> field_points_y);
  void wpt_keep_in_lane(size_t index, double center_line_start_x,
                        double center_line_start_y, double center_line_end_x,
                        double center_line_end_y, double tolerance);
  void wpt_keep_out_circle(size_t index, double field_point_x,
                           double field_point_y, double keep_in_radius);

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
  void sgmt_keep_in_circle(size_t from_index, size_t to_index,
                           double field_point_x, double field_point_y,
                           double keep_in_radius);
  void sgmt_keep_in_polygon(size_t from_index, size_t to_index,
                            rust::Vec<double> field_points_x,
                            rust::Vec<double> field_points_y);
  void sgmt_keep_in_lane(size_t from_index, size_t to_index,
                         double center_line_start_x, double center_line_start_y,
                         double center_line_end_x, double center_line_end_y,
                         double tolerance);
  void sgmt_keep_out_circle(size_t from_index, size_t to_index, double x,
                            double y, double radius);

  /**
   * Add a callback that will be called on each iteration of the solver.
   *
   * @param callback A `fn` (not a closure) to be executed. The callback's first
   *   parameter will be a `trajopt::SwerveTrajectory`, and the second parameter
   *   will be an `i64` equal to the handle passed in `generate()`.
   *
   * This function can be called multiple times to add multiple callbacks.
   */
  void add_callback(rust::Fn<void(SwerveTrajectory, int64_t)> callback);

  // TODO: Return std::expected<SwerveTrajectory, sleipnir::SolverExitCondition>
  // instead of throwing exception, once cxx supports it
  //
  // https://github.com/dtolnay/cxx/issues/1052
  SwerveTrajectory generate(bool diagnostics = false, int64_t handle = 0) const;

 private:
  trajopt::SwervePathBuilder path_builder;
};

class DifferentialTrajectoryGenerator {
 public:
  DifferentialTrajectoryGenerator() = default;

  void set_drivetrain(const DifferentialDrivetrain& drivetrain);
  void set_bumpers(double front, double left, double right, double back);
  void set_control_interval_counts(const rust::Vec<size_t> counts);
  void sgmt_initial_guess_points(size_t from_index,
                                 const rust::Vec<Pose2d>& guess_points);

  void pose_wpt(size_t index, double x, double y, double heading);
  void translation_wpt(size_t index, double x, double y, double heading_guess);
  void empty_wpt(size_t index, double x_guess, double y_guess,
                 double heading_guess);

  void wpt_linear_velocity_direction(size_t index, double angle);
  void wpt_linear_velocity_max_magnitude(size_t index, double magnitude);
  void wpt_angular_velocity_max_magnitude(size_t index,
                                          double angular_velocity);
  void wpt_linear_acceleration_max_magnitude(size_t index, double magnitude);
  void wpt_point_at(size_t index, double field_point_x, double field_point_y,
                    double heading_tolerance, bool flip);
  void wpt_keep_in_circle(size_t index, double field_point_x,
                          double field_point_y, double keep_in_radius);
  void wpt_keep_in_polygon(size_t index, rust::Vec<double> field_points_x,
                           rust::Vec<double> field_points_y);
  void wpt_keep_in_lane(size_t index, double center_line_start_x,
                        double center_line_start_y, double center_line_end_x,
                        double center_line_end_y, double tolerance);

  void wpt_keep_out_circle(size_t index, double field_point_x,
                           double field_point_y, double keep_in_radius);

  void sgmt_linear_velocity_direction(size_t from_index, size_t to_index,
                                      double angle);
  void sgmt_linear_velocity_max_magnitude(size_t from_index, size_t to_index,
                                          double magnitude);
  void sgmt_angular_velocity_max_magnitude(size_t from_index, size_t to_index,
                                           double angular_velocity);
  void sgmt_linear_acceleration_max_magnitude(size_t from_index,
                                              size_t to_index,
                                              double magnitude);
  void sgmt_keep_in_circle(size_t from_index, size_t to_index,
                           double field_point_x, double field_point_y,
                           double keep_in_radius);
  void sgmt_keep_in_polygon(size_t from_index, size_t to_index,
                            rust::Vec<double> field_points_x,
                            rust::Vec<double> field_points_y);
  void sgmt_keep_in_lane(size_t from_index, size_t to_index,
                         double center_line_start_x, double center_line_start_y,
                         double center_line_end_x, double center_line_end_y,
                         double tolerance);

  void sgmt_keep_out_circle(size_t from_index, size_t to_index, double x,
                            double y, double radius);

  /**
   * Add a callback that will be called on each iteration of the solver.
   *
   * @param callback A `fn` (not a closure) to be executed. The callback's first
   *   parameter will be a `trajopt::DifferentialTrajectory`, and the second
   *   parameter will be an `i64` equal to the handle passed in `generate()`.
   *
   * This function can be called multiple times to add multiple callbacks.
   */
  void add_callback(rust::Fn<void(DifferentialTrajectory, int64_t)> callback);

  // TODO: Return std::expected<DifferentialTrajectory,
  // sleipnir::SolverExitCondition> instead of throwing exception, once cxx
  // supports it
  //
  // https://github.com/dtolnay/cxx/issues/1052
  DifferentialTrajectory generate(bool diagnostics = false,
                                  int64_t handle = 0) const;

 private:
  trajopt::DifferentialPathBuilder path_builder;
};

std::unique_ptr<SwerveTrajectoryGenerator> swerve_trajectory_generator_new();

std::unique_ptr<DifferentialTrajectoryGenerator>
differential_trajectory_generator_new();

void cancel_all();

}  // namespace trajopt::rsffi
