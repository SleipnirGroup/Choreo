// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <vector>

#include <wpi/math/geometry/Translation2d.hpp>
#include <wpi/units/angular_velocity.hpp>
#include <wpi/units/length.hpp>
#include <wpi/units/mass.hpp>
#include <wpi/units/moment_of_inertia.hpp>
#include <wpi/units/torque.hpp>
#include <wpi/util/json.hpp>
#include <wpi/units/current.hpp>
#include "variables/variable.hpp"
#include "expr.hpp"
#include "type_traits"
#include "geometry/translation2e.hpp"
#ifdef WITH_TRAJOPT
#include <trajopt/differential_trajectory_generator.hpp>
#include <trajopt/geometry/translation2.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#endif

namespace choreo {
using namespace wpi::units::literals;
                // motor_config: MotorConfig {
                //     free_speed: Expr::new("5800 RPM", (5800.0 / 60.0) * std::f64::consts::TAU),
                //     stall_torque: Expr::new("9.36 N * m", 9.36),
                //     kT: Expr::new("0.0197 N * m/A", 0.0197),
                //     kV: Expr::new("0.00206896552 V/rpm", 0.00206896552 * 60.0 / (2.0 * PI)),
                //     supply_limit: Expr::new("60 A", 60.0),
                //     stator_limit: Expr::new("120 A", 120.0),
                // },
struct MotorConfig {
  Expr<dimensions::AngVel> free_speed;
  Expr<dimensions::Torque> stall_torque;
  Expr<dimensions::KT> kT;
  Expr<dimensions::KV> kV;
  Expr<dimensions::Current> supply_limit;
  Expr<dimensions::Current> stator_limit;
};
struct RobotConfig {
  // TODO: decide if these should be hardcoded in the struct definition.
  Expr<dimensions::Mass> mass = 120_lb;  // kg, 150 lbs
  Expr<dimensions::MoI> inertia =
      6.0_kg_sq_m;  // kg-m^2, estimated moment of inertia of a typical FRC
                    // robot
  Expr<dimensions::Number> gearing = 6.5;
  Expr<dimensions::Length> radius = 2_in;  // 2 inches
  Expr<dimensions::AngVel> vmax =
      6000.0_rpm;  // 5400 RPM free speed of a typical FRC motor
  Expr<dimensions::Torque> tmax =
      1.2_Nm;  // N-m, estimated stall torque of a typical FRC motor with
               // gearing
  Expr<dimensions::Number> cof = 1.5;
  Expr<dimensions::Length> differential_track_width =
      22_in;  // m, distance between left and right wheels on a typical FRC
              // robot
  /// FL, BL, BR, FR
  std::vector<Translation2e> wheels = {
      {+11_in, +11_in}, {+11_in, -11_in}, {-11_in, -11_in}, {-11_in, +11_in}};
  
  // Counterclockwise winding order, start location doesn't matter;
  std::vector<Translation2e> bumpers = {
    {+15_in, +15_in}, {+15_in, -15_in}, {-15_in, -15_in}, {-15_in, +15_in}
  };

  static RobotConfig default_frc_swerve() {
    return RobotConfig{.mass = 150_lb,
                       .inertia = 6.0_kg_sq_m,
                       .gearing = 6.5,
                       .radius = 2_in,
                       .vmax = 6000.0_rpm,
                       .tmax = 1.2_Nm,
                       .cof = 1.5,
                       .differential_track_width = 22_in,
                       .wheels = {{+11_in, +11_in},
                                  {+11_in, -11_in},
                                  {-11_in, -11_in},
                                  {-11_in, +11_in}},
                       .bumpers = {
    {+15_in, +15_in}, {+15_in, -15_in}, {-15_in, -15_in}, {-15_in, +15_in}
  }};
  }
  wpi::units::newton_meter_t wheel_max_torque() {
    return tmax.unit() * gearing.unit();
  }

  wpi::units::radians_per_second_t wheel_max_velocity() {
    return vmax.unit() / gearing.unit();
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
    std::transform(
        bumpers.begin(), bumpers.end(), std::back_inserter(corners),
        [](Translation2e location) { return trajopt::Translation2d(location); });
    return trajopt::KeepOutRegion{0.01, corners};
  }
#endif
};
inline void to_json(wpi::util::json& json, const RobotConfig& config) {
  json = wpi::util::json::object(
      "mass", config.mass, "inertia", config.inertia, "gearing", config.gearing,
      "radius", config.radius, "vmax", config.vmax, "tmax", config.tmax, "cof",
      config.cof, "differential_track_width", config.differential_track_width,
      "wheels", config.wheels, "bumpers", config.bumpers);
}

inline void from_json(const wpi::util::json& json, RobotConfig& config) {
  config.mass = json.at("mass").get<choreo::Expr<dimensions::Mass>>();
  config.inertia =
      json.at("inertia")
          .get<choreo::Expr<dimensions::MoI>>();
  config.gearing = json.at("gearing").get<choreo::Expr<dimensions::Number>>();
  config.radius = json.at("radius").get<choreo::Expr<dimensions::Length>>();
  config.vmax =
      json.at("vmax").get<choreo::Expr<dimensions::AngVel>>();
  config.tmax = json.at("tmax").get<choreo::Expr<dimensions::Torque>>();
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
}
}  // namespace choreo
