// Copyright (c) Choreo contributors

#pragma once
#include <algorithm>
#include <memory>
#include <utility>
#include <vector>

#include <trajopt/swerve_trajectory_generator.hpp>
namespace choreo {
struct SwerveSample {
  double t;
  double x;
  double y;
  double heading;
  double vx;
  double vy;
  double omega;
  double ax;
  double ay;
  double alpha;
  std::vector<double> fx;  // FL, BL, BR, FR
  std::vector<double> fy;  // FL, BL, BR, FR

  SwerveSample(double t, double x, double y, double heading, double vx,
               double vy, double omega, double ax, double ay, double alpha,
               std::vector<double> fx, std::vector<double> fy)
      : t(t),
        x(x),
        y(y),
        heading(heading),
        vx(vx),
        vy(vy),
        omega(omega),
        ax(ax),
        ay(ay),
        alpha(alpha),
        fx(std::move(fx)),
        fy(std::move(fy)) {}
#ifdef WITH_TRAJOPT
  explicit SwerveSample(const trajopt::SwerveTrajectorySample& sample)
      : t(sample.timestamp),
        x(sample.x),
        y(sample.y),
        heading(sample.heading),
        vx(sample.velocity_x),
        vy(sample.velocity_y),
        omega(sample.angular_velocity),
        ax(sample.acceleration_x),
        ay(sample.acceleration_y),
        alpha(sample.angular_acceleration) {
    std::copy(sample.module_forces_x.begin(), sample.module_forces_x.end(),
              std::back_inserter(fx));
    std::copy(sample.module_forces_y.begin(), sample.module_forces_y.end(),
              std::back_inserter(fy));
  }
#endif
};
inline void to_json(wpi::util::json& json, const SwerveSample& sample) {
  json = wpi::util::json::object(
      "t", sample.t, "x", sample.x, "y", sample.y, "heading", sample.heading,
      "vx", sample.vx, "vy", sample.vy, "omega", sample.omega, "ax", sample.ax,
      "ay", sample.ay, "alpha", sample.alpha, "fx", sample.fx, "fy", sample.fy);
}
inline void from_json(const wpi::util::json& json, SwerveSample& sample) {
  sample.t = json.at("t").get_double();
  sample.x = json.at("x").get_double();
  sample.y = json.at("y").get_double();
  sample.heading = json.at("heading").get_double();
  sample.vx = json.at("vx").get_double();
  sample.vy = json.at("vy").get_double();
  sample.omega = json.at("omega").get_double();
  sample.ax = json.at("ax").get_double();
  sample.ay = json.at("ay").get_double();
  sample.alpha = json.at("alpha").get_double();
  auto fxJson = json.at("fx").get_array();
  auto fyJson = json.at("fy").get_array();
  std::transform(fxJson.begin(), fxJson.end(), std::back_inserter(sample.fx),
                 [](const wpi::util::json& val) { return val.get_number(); });
  std::transform(fyJson.begin(), fyJson.end(), std::back_inserter(sample.fy),
                 [](const wpi::util::json& val) { return val.get_number(); });
}
}  // namespace choreo
