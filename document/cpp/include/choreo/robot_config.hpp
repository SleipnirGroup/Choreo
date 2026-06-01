// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <vector>

#include <wpi/math/geometry/Translation2d.hpp>
#include <wpi/units/angular_velocity.hpp>
#include <wpi/units/current.hpp>
#include <wpi/units/length.hpp>
#include <wpi/units/mass.hpp>
#include <wpi/units/moment_of_inertia.hpp>
#include <wpi/units/torque.hpp>
#include <wpi/util/json.hpp>

#include "expr.hpp"
#include "geometry/translation2e.hpp"
#include "type_traits"
#include "variables/variable.hpp"
#ifdef WITH_TRAJOPT
#include <trajopt/differential_trajectory_generator.hpp>
#include <trajopt/geometry/translation2.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#endif

namespace choreo {
using namespace wpi::units::literals;

struct MotorConfig {
  static MotorConfig fromJson(const wpi::util::json& json);
  Expr<dimensions::AngVel> free_speed;
  Expr<dimensions::Torque> stall_torque;
  Expr<dimensions::KT> kT;
  Expr<dimensions::KV> kV;
  Expr<dimensions::Current> supply_limit;
  Expr<dimensions::Current> stator_limit;
};
inline void to_json(wpi::util::json& json, const MotorConfig& config) {
  json = wpi::util::json::object(
      "free_speed", config.free_speed, "stall_torque", config.stall_torque,
      "kT", config.kT, "kV", config.kV, "supply_limit", config.supply_limit,
      "stator_limit", config.stator_limit);
}
inline void from_json(const wpi::util::json& json, MotorConfig& config) {
  config.free_speed = json.at("free_speed").get<Expr<dimensions::AngVel>>();
  config.stall_torque = json.at("stall_torque").get<Expr<dimensions::Torque>>();
  config.kT = json.at("kT").get<Expr<dimensions::KT>>();
  config.kV = json.at("kV").get<Expr<dimensions::KV>>();
  config.supply_limit =
      json.at("supply_limit").get<Expr<dimensions::Current>>();
  config.stator_limit =
      json.at("stator_limit").get<Expr<dimensions::Current>>();
}

inline MotorConfig MotorConfig::fromJson(const wpi::util::json& json) {
  MotorConfig value;
  from_json(json, value);
  return value;
}

struct RobotConfig {
  static RobotConfig fromJson(const wpi::util::json& json);
  // TODO: decide if these should be hardcoded in the struct definition.
  Expr<dimensions::Mass> mass;
  Expr<dimensions::MoI> inertia;
  Expr<dimensions::Number> gearing;
  Expr<dimensions::Length> radius;
  Expr<dimensions::Number> cof;
  Expr<dimensions::Length> differential_track_width;
  /// FL, BL, BR, FR
  std::vector<Translation2e> wheels;

  // Counterclockwise winding order, start location doesn't matter;
  std::vector<Translation2e> bumpers;
  MotorConfig motor;

  wpi::units::newton_meter_t wheel_max_torque() {
    return motor.stall_torque.unit() * gearing.unit();
  }

  wpi::units::radians_per_second_t wheel_max_velocity() {
    return motor.free_speed.unit() / gearing.unit();
  }
#ifdef WITH_TRAJOPT

  trajopt::SwerveDrivetrain to_swerve_drivetrain() {
    std::vector<trajopt::Translation2d> trajoptModules;
    trajoptModules.reserve(wheels.size());
    std::transform(
        wheels.begin(), wheels.end(), std::back_inserter(trajoptModules),
        [](Translation2e module) { return trajopt::Translation2d(module); });
    return trajopt::SwerveDrivetrain{
        .mass = mass,
        .moi = inertia,
        // m
        .wheel_radius = radius,
        // rad/s
        .wheel_max_angular_velocity = wheel_max_velocity().value(),
        // N-m
        .wheel_max_torque = wheel_max_torque().value(),
        // unitless
        .wheel_cof = cof,
        // m
        .modules = trajoptModules};
  }

  trajopt::DifferentialDrivetrain to_differential_drivetrain() {
    return trajopt::DifferentialDrivetrain{
        .mass = mass,
        .moi = inertia,
        // m
        .wheel_radius = radius,
        // rad/s
        .wheel_max_angular_velocity = wheel_max_velocity().value(),
        // N-m
        .wheel_max_torque = wheel_max_torque().value(),
        // unitless
        .wheel_cof = cof,
        // m
        .trackwidth = differential_track_width};
  }
  trajopt::KeepOutRegion to_bumpers() {
    std::vector<trajopt::Translation2d> corners;
    corners.reserve(bumpers.size());
    std::transform(bumpers.begin(), bumpers.end(), std::back_inserter(corners),
                   [](Translation2e location) {
                     return trajopt::Translation2d(location);
                   });
    return trajopt::KeepOutRegion{0.01, corners};
  }
#endif
};
inline void to_json(wpi::util::json& json, const RobotConfig& config) {
  json = wpi::util::json::object(
      "mass", config.mass, "inertia", config.inertia, "gearing", config.gearing,
      "radius", config.radius, "cof", config.cof, "differential_track_width",
      config.differential_track_width, "wheels", config.wheels, "bumpers",
      config.bumpers, "motor", config.motor);
}

inline void from_json(const wpi::util::json& json, RobotConfig& config) {
  config.mass = json.at("mass").get<choreo::Expr<dimensions::Mass>>();
  config.inertia = json.at("inertia").get<choreo::Expr<dimensions::MoI>>();
  config.gearing = json.at("gearing").get<choreo::Expr<dimensions::Number>>();
  config.radius = json.at("radius").get<choreo::Expr<dimensions::Length>>();
  config.cof = json.at("cof").get<choreo::Expr<dimensions::Number>>();
  config.differential_track_width =
      json.at("differential_track_width")
          .get<choreo::Expr<dimensions::Length>>();
  config.wheels.clear();
  auto whs = json.at("wheels").get_array();
  std::transform(whs.begin(), whs.end(), std::back_inserter(config.wheels),
                 [](auto modJson) { return modJson.get<Translation2e>(); });
  config.bumpers.clear();
  auto bmps = json.at("bumpers").get_array();
  std::transform(bmps.begin(), bmps.end(), std::back_inserter(config.bumpers),
                 [](auto modJson) { return modJson.get<Translation2e>(); });
  config.motor = json.at("motor").get<MotorConfig>();
}

inline RobotConfig RobotConfig::fromJson(const wpi::util::json& json) {
  RobotConfig value;
  from_json(json, value);
  return value;
}

}  // namespace choreo
