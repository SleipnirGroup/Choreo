#pragma once
#include <choreo/trajectory.hpp>
#include <choreo/project.hpp>
#include <choreo/robot_config.hpp>
#include <wpi/units/angular_velocity.hpp>
#include <wpi/units/length.hpp>
#include <wpi/units/mass.hpp>
#include <wpi/units/moment_of_inertia.hpp>
#include <wpi/units/torque.hpp>
#include <wpi/util/json.hpp>
#include <wpi/units/current.hpp>
namespace choreo {
    TrajectoryFile defaultNewTrajectory(std::string name = "New Trajectory") {
        return TrajectoryFile{
            .name = name,
            .version = 4,
            .snapshot = std::nullopt,
            .params = Parameters{},
            .trajectory = std::nullopt,
            .events = {}
        };
    }
    RobotConfig default_frc_swerve() {
    return RobotConfig{.mass = 150_lb,
                       .inertia = 6.0_kg_sq_m,
                       .gearing = 6.5,
                       .radius = 2_in,
                       .cof = 1.5,
                       .differential_track_width = 22_in,
                       .wheels = {{+11_in, +11_in},
                                  {+11_in, -11_in},
                                  {-11_in, -11_in},
                                  {-11_in, +11_in}},
                       .bumpers = {
                           {+15_in, +15_in}, {+15_in, -15_in},
                           {-15_in, -15_in}, {-15_in, +15_in}},
                       .motor = MotorConfig{
                           .free_speed = 6380_rpm,
                           .stall_torque = 2.41_Nm,
                           .kT = dimensions::KT::baseUnit{0.027},
                           .kV = dimensions::KV::baseUnit{0.016},
                           .supply_limit = 40_A,
                           .stator_limit = 40_A}
    };
}
    ProjectFile defaultNewProject(std::string name = "New Project") {
        return ProjectFile{
            .name = name,
            .version = 4,
            .type = DriveType::Swerve,
            .variables = Variables{},
            .config = default_frc_swerve()
        };
    }
    
}