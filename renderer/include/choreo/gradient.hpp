// Copyright (c) Choreo contributors

#pragma once
#include <cmath>
#include <format>
#include <print>
#include <string>
#include <vector>
#include <functional>

#include <choreo/trajectory/swerve_sample.hpp>
#include <choreo/trajectory/differential_sample.hpp>
namespace choreo {
namespace render {
struct HSL {
  double h;
  double s;
  double l;

  std::string toCSS() {
    return std::format("hsl({}, {}%, {}%)", static_cast<int>(h * 360), s * 100,
                       l * 100);
  }
};
namespace path_gradient {
struct PathGradient {
  std::function<HSL(choreo::SwerveDriveType::WPILibTrajectory trajectory, size_t index)>
      swerve_color;
  // std::function<HSL(std::vector<choreo::DifferentialDriveType::WPILibSample>, size_t index)>
  //     differential_color;
  HSL operator()(choreo::SwerveDriveType::WPILibTrajectory trajectory, size_t index) {
    return swerve_color(trajectory, index);
  }
  // HSL operator()(std::vector<choreo::DifferentialDriveType::WPILibSample> samples, size_t index) {
  //   return differential_color(samples, index);
  // }
};
static PathGradient progress{[](choreo::SwerveDriveType::WPILibTrajectory trajectory, size_t index) {
  auto interp =
      static_cast<double>(index) / static_cast<double>(trajectory.Samples().size());

  return HSL{120.0 / 360.0 * (1 - interp), 1, 0.5};
}};
static PathGradient linearVelocity{[](choreo::SwerveDriveType::WPILibTrajectory trajectory, size_t index) {
  auto samp = trajectory.Samples()[index];
  auto v = std::hypot(samp.velocity.vx.value(), samp.velocity.vy.value());

  return HSL{120.0 / 360.0 * (v / 5.0), 1, 0.5};
}};
}  // namespace path_gradient
}  // namespace render
}  // namespace choreo
