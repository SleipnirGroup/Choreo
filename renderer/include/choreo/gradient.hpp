// Copyright (c) Choreo contributors

#pragma once
#include <cmath>
#include <format>
#include <print>
#include <string>
#include <vector>

#include <choreo/trajectory/swerve_sample.hpp>
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
  std::function<HSL(std::vector<choreo::SwerveSample>, size_t index)>
      swerve_color;
  HSL operator()(std::vector<choreo::SwerveSample> samples, size_t index) {
    return swerve_color(samples, index);
  }
};
static PathGradient progress{[](auto samples, auto index) {
  auto interp =
      static_cast<double>(index) / static_cast<double>(samples.size());

  return HSL{120.0 / 360.0 * (1 - interp), 1, 0.5};
}};
static PathGradient linearVelocity{[](auto samples, auto index) {
  auto samp = samples[index];
  auto v = std::hypot(samp.velocity.vx.value(), samp.velocity.vy.value());

  return HSL{120.0 / 360.0 * (v / 5.0), 1, 0.5};
}};
}  // namespace path_gradient
}  // namespace render
}  // namespace choreo
