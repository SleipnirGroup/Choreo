// Copyright (c) Choreo contributors

#pragma once
#include <iomanip>
#include <memory>
#include <sstream>
#include <string>
#include <vector>

#include "../svg.hpp"
#include "choreo/trajectory/swerve_sample.hpp"
#include "renderer.hpp"

namespace choreo::svg_helpers {

/**
 * Build an <animateMotion> RawElement that moves through sample (x,y) points
 * at the sample times t. Times are emitted in seconds.
 *
 * Behavior:
 * - begin is set to the first sample's t (in seconds).
 * - dur is (last.t - first.t) seconds (0s for a single-sample input).
 * - values is "x,y;x,y;..." with fixed precision.
 * - keyTimes is normalized times "0;...;1" matching each value.
 * - calcMode="linear" and fill="freeze".
 *
 * Returns nullptr for empty input.
 */
inline void make_animateMotion(SVGPP::Group* parent,
                               const std::vector<SwerveSample>& samples,
                               int precision = 3) {
  using namespace wpi::units::literals;
  if (samples.empty())
    return;

  const auto t0 = samples.front().timestamp;
  const auto tN = samples.back().timestamp;
  const auto duration = (tN - t0 >= 0.0_s) ? (tN - t0) : 0.0_s;

  std::ostringstream vals;
  std::ostringstream kt;
  vals << std::fixed << std::setprecision(precision);
  kt << std::fixed << std::setprecision(precision);

  for (size_t i = 0; i < samples.size(); ++i) {
    const auto& s = samples[i];
    vals << s.pose.X().value() << "," << s.pose.Y().value();
    double normalized_time = 0.0;
    if (duration > 0.0_s)
      normalized_time = (s.timestamp - t0) / duration;
    kt << normalized_time;
    if (i + 1 < samples.size()) {
      vals << ";";
      kt << ";";
    }
  }

  auto node = parent->add_child<SVGPP::RawElement>("animateMotion");

  std::ostringstream ss;
  ss << std::fixed << std::setprecision(precision) << t0.value() << "s";
  node->set_attr("begin", ss.str());
  ss.str("");
  ss.clear();
  ss << std::fixed << std::setprecision(precision) << duration.value() << "s";
  node->set_attr("dur", ss.str());

  node->set_attr("values", vals.str());
  node->set_attr("keyTimes", kt.str());
  node->set_attr("calcMode", std::string("linear"));
  node->set_attr("fill", std::string("freeze"));
  node->set_attr("repeatCount", "indefinite");

  // animateTransform to follow heading (radians -> degrees)
  std::ostringstream ang_vals;
  ang_vals << std::fixed << std::setprecision(precision);
  for (size_t i = 0; i < samples.size(); ++i) {
    double deg = samples[i].pose.Rotation().Degrees().value();
    ang_vals << deg;
    if (i + 1 < samples.size())
      ang_vals << ";";
  }

  auto rot = parent->add_child<SVGPP::RawElement>("animateTransform");
  rot->set_attr("attributeName", std::string("transform"));
  rot->set_attr("type", std::string("rotate"));
  rot->set_attr("values", ang_vals.str());
  rot->set_attr("keyTimes", kt.str());
  ss.str("");
  ss.clear();
  ss << std::fixed << std::setprecision(precision) << t0.value() << "s";
  rot->set_attr("begin", ss.str());
  ss.str("");
  ss.clear();
  ss << std::fixed << std::setprecision(precision) << duration.value() << "s";
  rot->set_attr("dur", ss.str());
  rot->set_attr("calcMode", std::string("linear"));
  rot->set_attr("fill", std::string("freeze"));
  rot->set_attr("repeatCount", std::string("indefinite"));
}

}  // namespace choreo::svg_helpers
