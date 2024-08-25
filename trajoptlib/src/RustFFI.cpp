// Copyright (c) TrajoptLib contributors

#include "RustFFI.hpp"

#include <stdint.h>

#include <algorithm>
#include <cstddef>
#include <stdexcept>
#include <vector>

#include "trajopt/constraint/AngularVelocityMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/LinearAccelerationMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/LinearVelocityDirectionConstraint.hpp"
#include "trajopt/constraint/LinearVelocityMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/PointAtConstraint.hpp"
#include "trajopt/util/Cancellation.hpp"
#include "trajoptlib/src/lib.rs.h"

namespace trajopt::rsffi {

void SwervePathBuilder::set_drivetrain(const SwerveDrivetrain& drivetrain) {
  std::vector<trajopt::Translation2d> cppModules;
  for (const auto& module : drivetrain.modules) {
    cppModules.emplace_back(module.x, module.y);
  }

  path_builder.SetDrivetrain(trajopt::SwerveDrivetrain{
      drivetrain.mass, drivetrain.moi, drivetrain.wheel_radius,
      drivetrain.wheel_max_angular_velocity, drivetrain.wheel_max_torque,
      std::move(cppModules)});
}

void SwervePathBuilder::set_control_interval_counts(
    const rust::Vec<size_t> counts) {
  std::vector<size_t> cppCounts;
  for (const auto& count : counts) {
    cppCounts.emplace_back(count);
  }

  path_builder.ControlIntervalCounts(std::move(cppCounts));
}

void SwervePathBuilder::set_bumpers(double length, double width) {
  path_builder.AddBumpers(
      trajopt::Bumpers{.safetyDistance = 0.01,
                       .points = {{+length / 2, +width / 2},
                                  {-length / 2, +width / 2},
                                  {-length / 2, -width / 2},
                                  {+length / 2, -width / 2}}});
}

void SwervePathBuilder::pose_wpt(size_t index, double x, double y,
                                 double heading) {
  path_builder.PoseWpt(index, x, y, heading);
}

void SwervePathBuilder::translation_wpt(size_t index, double x, double y,
                                        double heading_guess) {
  path_builder.TranslationWpt(index, x, y, heading_guess);
}

void SwervePathBuilder::empty_wpt(size_t index, double x_guess, double y_guess,
                                  double heading_guess) {
  path_builder.WptInitialGuessPoint(index, {x_guess, y_guess, heading_guess});
}

void SwervePathBuilder::sgmt_initial_guess_points(
    size_t from_index, const rust::Vec<Pose2d>& guess_points) {
  std::vector<trajopt::Pose2d> cppGuessPoints;
  for (const auto& guess_point : guess_points) {
    cppGuessPoints.emplace_back(guess_point.x, guess_point.y,
                                guess_point.heading);
  }

  path_builder.SgmtInitialGuessPoints(from_index, std::move(cppGuessPoints));
}

void SwervePathBuilder::wpt_linear_velocity_direction(size_t index,
                                                      double angle) {
  path_builder.WptConstraint(index,
                             trajopt::LinearVelocityDirectionConstraint{angle});
}

void SwervePathBuilder::wpt_linear_velocity_max_magnitude(size_t index,
                                                          double magnitude) {
  path_builder.WptConstraint(
      index, trajopt::LinearVelocityMaxMagnitudeConstraint{magnitude});
}

void SwervePathBuilder::wpt_angular_velocity_max_magnitude(
    size_t index, double angular_velocity) {
  path_builder.WptConstraint(
      index, trajopt::AngularVelocityMaxMagnitudeConstraint{angular_velocity});
}

void SwervePathBuilder::wpt_linear_acceleration_max_magnitude(
    size_t index, double magnitude) {
  path_builder.WptConstraint(
      index, trajopt::LinearAccelerationMaxMagnitudeConstraint{magnitude});
}

void SwervePathBuilder::wpt_point_at(size_t index, double field_point_x,
                                     double field_point_y,
                                     double heading_tolerance, bool flip) {
  path_builder.WptConstraint(
      index, trajopt::PointAtConstraint{
                 trajopt::Translation2d{field_point_x, field_point_y},
                 heading_tolerance, flip});
}

void SwervePathBuilder::sgmt_linear_velocity_direction(size_t from_index,
                                                       size_t to_index,
                                                       double angle) {
  path_builder.SgmtConstraint(
      from_index, to_index, trajopt::LinearVelocityDirectionConstraint{angle});
}

void SwervePathBuilder::sgmt_linear_velocity_max_magnitude(size_t from_index,
                                                           size_t to_index,
                                                           double magnitude) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::LinearVelocityMaxMagnitudeConstraint{magnitude});
}

void SwervePathBuilder::sgmt_angular_velocity_max_magnitude(
    size_t from_index, size_t to_index, double angular_velocity) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::AngularVelocityMaxMagnitudeConstraint{angular_velocity});
}

void SwervePathBuilder::sgmt_linear_acceleration_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::LinearAccelerationMaxMagnitudeConstraint{magnitude});
}

void SwervePathBuilder::sgmt_point_at(size_t from_index, size_t to_index,
                                      double field_point_x,
                                      double field_point_y,
                                      double heading_tolerance, bool flip) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::PointAtConstraint{
          {field_point_x, field_point_y}, heading_tolerance, flip});
}

void SwervePathBuilder::sgmt_circle_obstacle(size_t from_index, size_t to_index,
                                             double x, double y,
                                             double radius) {
  path_builder.SgmtObstacle(from_index, to_index, {radius, {{x, y}}});
}

void SwervePathBuilder::sgmt_polygon_obstacle(size_t from_index,
                                              size_t to_index,
                                              const rust::Vec<double> x,
                                              const rust::Vec<double> y,
                                              double radius) {
  if (x.size() != y.size()) [[unlikely]] {
    return;
  }

  std::vector<trajopt::Translation2d> cppPoints;
  for (size_t i = 0; i < x.size(); ++i) {
    cppPoints.emplace_back(x.at(i), y.at(i));
  }

  path_builder.SgmtObstacle(from_index, to_index,
                            trajopt::Obstacle{.safetyDistance = radius,
                                              .points = std::move(cppPoints)});
}

SwerveTrajectory SwervePathBuilder::generate(bool diagnostics,
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
          std::move(fx), std::move(fy)});
    }

    return SwerveTrajectory{std::move(rustSamples)};
  } else {
    throw std::runtime_error{sol.error()};
  }
}

/**
 * Add a callback that will be called on each iteration of the solver.
 *
 * @param callback: a `fn` (not a closure) to be executed. The callback's
 * first parameter will be a `trajopt::SwerveTrajectory`, and the second
 * parameter will be an `i64` equal to the handle passed in `generate()`
 *
 * This function can be called multiple times to add multiple callbacks.
 */
void SwervePathBuilder::add_progress_callback(
    rust::Fn<void(SwerveTrajectory, int64_t)> callback) {
  path_builder.AddIntermediateCallback(
      [=](trajopt::SwerveSolution& solution, int64_t handle) {
        trajopt::SwerveTrajectory cppTrajectory{solution};

        rust::Vec<SwerveTrajectorySample> rustSamples;
        for (const auto& cppSample : cppTrajectory.samples) {
          rust::Vec<double> fx;
          std::copy(cppSample.moduleForcesX.begin(),
                    cppSample.moduleForcesX.end(), std::back_inserter(fx));

          rust::Vec<double> fy;
          std::copy(cppSample.moduleForcesY.begin(),
                    cppSample.moduleForcesY.end(), std::back_inserter(fy));

          rustSamples.push_back(SwerveTrajectorySample{
              cppSample.timestamp, cppSample.x, cppSample.y, cppSample.heading,
              cppSample.velocityX, cppSample.velocityY,
              cppSample.angularVelocity, std::move(fx), std::move(fy)});
        }

        callback(SwerveTrajectory{rustSamples}, handle);
      });
}

std::unique_ptr<SwervePathBuilder> swerve_path_builder_new() {
  return std::make_unique<SwervePathBuilder>();
}

void DifferentialPathBuilder::set_drivetrain(
    const DifferentialDrivetrain& drivetrain) {
  path_builder.SetDrivetrain(trajopt::DifferentialDrivetrain{
      drivetrain.mass, drivetrain.moi, drivetrain.trackwidth,
      drivetrain.wheel_radius, drivetrain.wheel_max_angular_velocity,
      drivetrain.wheel_max_torque});
}

void DifferentialPathBuilder::set_control_interval_counts(
    const rust::Vec<size_t> counts) {
  std::vector<size_t> cppCounts;
  for (const auto& count : counts) {
    cppCounts.emplace_back(count);
  }

  path_builder.ControlIntervalCounts(std::move(cppCounts));
}

void DifferentialPathBuilder::set_bumpers(double length, double width) {
  path_builder.AddBumpers(
      trajopt::Bumpers{.safetyDistance = 0.01,
                       .points = {{+length / 2, +width / 2},
                                  {-length / 2, +width / 2},
                                  {-length / 2, -width / 2},
                                  {+length / 2, -width / 2}}});
}

void DifferentialPathBuilder::pose_wpt(size_t index, double x, double y,
                                       double heading) {
  path_builder.PoseWpt(index, x, y, heading);
}

void DifferentialPathBuilder::translation_wpt(size_t index, double x, double y,
                                              double heading_guess) {
  path_builder.TranslationWpt(index, x, y, heading_guess);
}

void DifferentialPathBuilder::empty_wpt(size_t index, double x_guess,
                                        double y_guess, double heading_guess) {
  path_builder.WptInitialGuessPoint(index, {x_guess, y_guess, heading_guess});
}

void DifferentialPathBuilder::sgmt_initial_guess_points(
    size_t from_index, const rust::Vec<Pose2d>& guess_points) {
  std::vector<trajopt::Pose2d> cppGuessPoints;
  for (const auto& guess_point : guess_points) {
    cppGuessPoints.emplace_back(guess_point.x, guess_point.y,
                                guess_point.heading);
  }

  path_builder.SgmtInitialGuessPoints(from_index, std::move(cppGuessPoints));
}

void DifferentialPathBuilder::wpt_linear_velocity_direction(size_t index,
                                                            double angle) {
  path_builder.WptConstraint(index,
                             trajopt::LinearVelocityDirectionConstraint{angle});
}

void DifferentialPathBuilder::wpt_linear_velocity_max_magnitude(
    size_t index, double magnitude) {
  path_builder.WptConstraint(
      index, trajopt::LinearVelocityMaxMagnitudeConstraint{magnitude});
}

void DifferentialPathBuilder::wpt_angular_velocity_max_magnitude(
    size_t index, double angular_velocity) {
  path_builder.WptConstraint(
      index, trajopt::AngularVelocityMaxMagnitudeConstraint{angular_velocity});
}

void DifferentialPathBuilder::wpt_linear_acceleration_max_magnitude(
    size_t index, double magnitude) {
  path_builder.WptConstraint(
      index, trajopt::LinearAccelerationMaxMagnitudeConstraint{magnitude});
}

void DifferentialPathBuilder::wpt_point_at(size_t index, double field_point_x,
                                           double field_point_y,
                                           double heading_tolerance,
                                           bool flip) {
  path_builder.WptConstraint(
      index, trajopt::PointAtConstraint{
                 trajopt::Translation2d{field_point_x, field_point_y},
                 heading_tolerance, flip});
}

void DifferentialPathBuilder::sgmt_linear_velocity_direction(size_t from_index,
                                                             size_t to_index,
                                                             double angle) {
  path_builder.SgmtConstraint(
      from_index, to_index, trajopt::LinearVelocityDirectionConstraint{angle});
}

void DifferentialPathBuilder::sgmt_linear_velocity_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::LinearVelocityMaxMagnitudeConstraint{magnitude});
}

void DifferentialPathBuilder::sgmt_angular_velocity_max_magnitude(
    size_t from_index, size_t to_index, double angular_velocity) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::AngularVelocityMaxMagnitudeConstraint{angular_velocity});
}

void DifferentialPathBuilder::sgmt_linear_acceleration_max_magnitude(
    size_t from_index, size_t to_index, double magnitude) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::LinearAccelerationMaxMagnitudeConstraint{magnitude});
}

void DifferentialPathBuilder::sgmt_circle_obstacle(size_t from_index,
                                                   size_t to_index, double x,
                                                   double y, double radius) {
  path_builder.SgmtObstacle(from_index, to_index, {radius, {{x, y}}});
}

void DifferentialPathBuilder::sgmt_polygon_obstacle(size_t from_index,
                                                    size_t to_index,
                                                    const rust::Vec<double> x,
                                                    const rust::Vec<double> y,
                                                    double radius) {
  if (x.size() != y.size()) [[unlikely]] {
    return;
  }

  std::vector<trajopt::Translation2d> cppPoints;
  for (size_t i = 0; i < x.size(); ++i) {
    cppPoints.emplace_back(x.at(i), y.at(i));
  }

  path_builder.SgmtObstacle(from_index, to_index,
                            trajopt::Obstacle{.safetyDistance = radius,
                                              .points = std::move(cppPoints)});
}

DifferentialTrajectory DifferentialPathBuilder::generate(bool diagnostics,
                                                         int64_t handle) const {
  trajopt::DifferentialTrajectoryGenerator generator{path_builder, handle};
  if (auto sol = generator.Generate(diagnostics); sol.has_value()) {
    trajopt::DifferentialTrajectory cppTrajectory{sol.value()};

    rust::Vec<DifferentialTrajectorySample> rustSamples;
    for (const auto& cppSample : cppTrajectory.samples) {
      rustSamples.push_back(DifferentialTrajectorySample{
          cppSample.timestamp, cppSample.x, cppSample.y, cppSample.heading,
          cppSample.velocityL, cppSample.velocityR, cppSample.forceL,
          cppSample.forceR});
    }

    return DifferentialTrajectory{std::move(rustSamples)};
  } else {
    throw std::runtime_error{sol.error()};
  }
}

/**
 * Add a callback that will be called on each iteration of the solver.
 *
 * @param callback: a `fn` (not a closure) to be executed. The callback's
 * first parameter will be a `trajopt::DifferentialTrajectory`, and the second
 * parameter will be an `i64` equal to the handle passed in `generate()`
 *
 * This function can be called multiple times to add multiple callbacks.
 */
void DifferentialPathBuilder::add_progress_callback(
    rust::Fn<void(DifferentialTrajectory, int64_t)> callback) {
  path_builder.AddIntermediateCallback(
      [=](trajopt::DifferentialSolution& solution, int64_t handle) {
        trajopt::DifferentialTrajectory cppTrajectory{solution};

        rust::Vec<DifferentialTrajectorySample> rustSamples;
        for (const auto& cppSample : cppTrajectory.samples) {
          rustSamples.push_back(DifferentialTrajectorySample{
              cppSample.timestamp, cppSample.x, cppSample.y, cppSample.heading,
              cppSample.velocityL, cppSample.velocityR, cppSample.forceL,
              cppSample.forceR});
        }

        callback(DifferentialTrajectory{rustSamples}, handle);
      });
}

std::unique_ptr<DifferentialPathBuilder> differential_path_builder_new() {
  return std::make_unique<DifferentialPathBuilder>();
}

void cancel_all() {
  trajopt::GetCancellationFlag() = 1;
}

}  // namespace trajopt::rsffi
