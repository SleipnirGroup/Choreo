// Copyright (c) TrajoptLib contributors

#include "RustFFI.hpp"

#include <stdint.h>

#include <cstddef>
#include <stdexcept>
#include <vector>

#include "trajopt/SwerveTrajectoryGenerator.hpp"
#include "trajopt/constraint/AngularVelocityMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/LinearAccelerationMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/LinearVelocityDirectionConstraint.hpp"
#include "trajopt/constraint/LinearVelocityMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/PointAtConstraint.hpp"
#include "trajopt/drivetrain/SwerveModule.hpp"
#include "trajopt/trajectory/HolonomicTrajectory.hpp"
#include "trajopt/trajectory/HolonomicTrajectorySample.hpp"
#include "trajopt/util/Cancellation.hpp"
#include "trajoptlib/src/lib.rs.h"

namespace trajopt::rsffi {

void SwervePathBuilder::set_drivetrain(const SwerveDrivetrain& drivetrain) {
  std::vector<trajopt::SwerveModule> cppModules;
  for (const auto& module : drivetrain.modules) {
    cppModules.push_back(
        trajopt::SwerveModule{{module.x, module.y},
                              module.wheel_radius,
                              module.wheel_max_angular_velocity,
                              module.wheel_max_torque});
  }

  path_builder.SetDrivetrain(trajopt::SwerveDrivetrain{
      drivetrain.mass, drivetrain.moi, std::move(cppModules)});
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
                                     double heading_tolerance) {
  path_builder.WptConstraint(
      index, trajopt::PointAtConstraint{
                 trajopt::Translation2d{field_point_x, field_point_y},
                 heading_tolerance});
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
                                      double heading_tolerance) {
  path_builder.SgmtConstraint(
      from_index, to_index,
      trajopt::PointAtConstraint{{field_point_x, field_point_y},
                                 heading_tolerance});
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

HolonomicTrajectory SwervePathBuilder::generate(bool diagnostics,
                                                int64_t handle) const {
  trajopt::SwerveTrajectoryGenerator generator{path_builder, handle};
  if (auto sol = generator.Generate(diagnostics); sol.has_value()) {
    trajopt::HolonomicTrajectory cppTrajectory{sol.value()};

    rust::Vec<HolonomicTrajectorySample> rustSamples;
    for (const auto& cppSample : cppTrajectory.samples) {
      rust::Vec<double> fx;
      std::copy(cppSample.moduleForcesX.begin(), cppSample.moduleForcesX.end(),
                std::back_inserter(fx));

      rust::Vec<double> fy;
      std::copy(cppSample.moduleForcesY.begin(), cppSample.moduleForcesY.end(),
                std::back_inserter(fy));

      rustSamples.push_back(HolonomicTrajectorySample{
          cppSample.timestamp, cppSample.x, cppSample.y, cppSample.heading,
          cppSample.velocityX, cppSample.velocityY, cppSample.angularVelocity,
          std::move(fx), std::move(fy)});
    }

    return HolonomicTrajectory{std::move(rustSamples)};
  } else {
    throw std::runtime_error{sol.error()};
  }
}

/**
 * Add a callback that will be called on each iteration of the solver.
 *
 * @param callback: a `fn` (not a closure) to be executed. The callback's
 * first parameter will be a `trajopt::HolonomicTrajectory`, and the second
 * parameter will be an `i64` equal to the handle passed in `generate()`
 *
 * This function can be called multiple times to add multiple callbacks.
 */
void SwervePathBuilder::add_progress_callback(
    rust::Fn<void(HolonomicTrajectory, int64_t)> callback) {
  path_builder.AddIntermediateCallback(
      [=](trajopt::SwerveSolution& solution, int64_t handle) {
        trajopt::HolonomicTrajectory cppTrajectory{solution};

        rust::Vec<HolonomicTrajectorySample> rustSamples;
        for (const auto& cppSample : cppTrajectory.samples) {
          rust::Vec<double> fx;
          std::copy(cppSample.moduleForcesX.begin(),
                    cppSample.moduleForcesX.end(), std::back_inserter(fx));

          rust::Vec<double> fy;
          std::copy(cppSample.moduleForcesY.begin(),
                    cppSample.moduleForcesY.end(), std::back_inserter(fy));

          rustSamples.push_back(HolonomicTrajectorySample{
              cppSample.timestamp, cppSample.x, cppSample.y, cppSample.heading,
              cppSample.velocityX, cppSample.velocityY,
              cppSample.angularVelocity, std::move(fx), std::move(fy)});
        }

        callback(HolonomicTrajectory{rustSamples}, handle);
      });
}

HolonomicTrajectory _convert_sol_to_holonomic_trajectory(
    const trajopt::SwerveSolution& solution) {
  trajopt::HolonomicTrajectory cppTrajectory{solution};

  rust::Vec<HolonomicTrajectorySample> rustSamples;
  for (const auto& cppSample : cppTrajectory.samples) {
    rust::Vec<double> fx;
    std::copy(cppSample.moduleForcesX.begin(), cppSample.moduleForcesX.end(),
              std::back_inserter(fx));

    rust::Vec<double> fy;
    std::copy(cppSample.moduleForcesY.begin(), cppSample.moduleForcesY.end(),
              std::back_inserter(fy));

    rustSamples.push_back(HolonomicTrajectorySample{
        cppSample.timestamp, cppSample.x, cppSample.y, cppSample.heading,
        cppSample.velocityX, cppSample.velocityY, cppSample.angularVelocity,
        std::move(fx), std::move(fy)});
  }
  return HolonomicTrajectory{rustSamples};
}

HolonomicTrajectory SwervePathBuilder::calculate_linear_initial_guess() const {
  return _convert_sol_to_holonomic_trajectory(
      path_builder.CalculateInitialGuess());
}

HolonomicTrajectory SwervePathBuilder::calculate_spline_initial_guess() const {
  return _convert_sol_to_holonomic_trajectory(
      path_builder.CalculateSplineInitialGuess());
}

rust::Vec<rust::usize> SwervePathBuilder::calculate_control_interval_counts()
    const {
  auto cppCounts = path_builder.CalculateControlIntervalCounts();
  rust::Vec<rust::usize> rustCounts;
  for (const auto count : cppCounts) {
    rustCounts.emplace_back(count);
  }
  return rustCounts;
}

std::unique_ptr<SwervePathBuilder> swerve_path_builder_new() {
  return std::make_unique<SwervePathBuilder>();
}

void cancel_all() {
  trajopt::GetCancellationFlag() = 1;
}

}  // namespace trajopt::rsffi
