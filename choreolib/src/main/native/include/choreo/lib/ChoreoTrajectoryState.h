// Copyright (c) Choreo contributors

#pragma once

#include <array>

#include <frc/geometry/Pose2d.h>
#include <frc/kinematics/ChassisSpeeds.h>
#include <units/force.h>
#include <wpi/json_fwd.h>

namespace choreolib {

/// A single state in a ChoreoTrajectory
class ChoreoTrajectoryState {
 public:
  using ModuleForces = std::array<units::newton_t, 4>;

 public:
  ChoreoTrajectoryState() = default;

  /**
   * Creates a new ChoreoTrajectoryState given all its parameters
   *
   * @param t The timestamp of the new state
   * @param x The x position of the robot at this state
   * @param y The y position of the robot at this state
   * @param heading The heading of the robot at this state
   * @param xVel The x velocity of the robot at this state
   * @param yVel The y velocity of the robot at this state
   * @param angularVel The angular velocity of the robot at this state
   */
  ChoreoTrajectoryState(units::second_t t, units::meter_t x, units::meter_t y,
                        units::radian_t heading,
                        units::meters_per_second_t xVel,
                        units::meters_per_second_t yVel,
                        units::radians_per_second_t angularVel,
                        ModuleForces moduleForcesX, ModuleForces moduleForcesY);

  /**
   * Returns the pose of the robot at this state
   *
   * @return the pose of the robot at this state
   */
  frc::Pose2d GetPose() const;

  /**
   * Returns the field-relative chassis speeds of this state.
   *
   * @return the field-relative chassis speeds of this state.
   */
  frc::ChassisSpeeds GetChassisSpeeds() const;

  /**
   * Returns a new state interpolated between itself and endValue at i
   *
   * @param endValue The next state. It should have a timestamp after this
   * state.
   * @param i how far between the two trajectories we should be in range (0,1)
   * @return this state as an array of doubles
   */
  ChoreoTrajectoryState Interpolate(const ChoreoTrajectoryState& endValue,
                                    double i) const;

  /**
   * Returns a new instance of this state mirrored across the midline of the
   * field
   *
   * @return a new instance of this state mirrored across the midline of the
   *  field
   */
  ChoreoTrajectoryState Flipped() const;

  /// The time elapsed since the beginning of the trajectory
  units::second_t timestamp{0_s};

  /// The x position at that point in the trajectory
  units::meter_t x = 0_m;

  /// The y position at that point in the trajectory
  units::meter_t y = 0_m;

  /// The heading at that point in the trajectory
  units::radian_t heading = 0_rad;

  /// The x component of the velocity at that point in the trajectory
  units::meters_per_second_t velocityX = 0_mps;

  /// The y component of the velocity at that point in the trajectory
  units::meters_per_second_t velocityY = 0_mps;

  /// The angular component of the velocity at that point in the trajectory
  units::radians_per_second_t angularVelocity = 0_rad_per_s;

  /// The forces on the modules in the X direction
  /// Forces appear in the following order: [FL, FR, BL, BR]
  ModuleForces moduleForcesX{{0_N, 0_N, 0_N, 0_N}};

  /// The forces on the modules in the Y direction
  /// Forces appear in the following order: [FL, FR, BL, BR]
  ModuleForces moduleForcesY{{0_N, 0_N, 0_N, 0_N}};

 private:
  static constexpr units::meter_t fieldLength = 16.5410515_m;
};

void to_json(wpi::json& json, const ChoreoTrajectoryState& trajState);
void from_json(const wpi::json& json, ChoreoTrajectoryState& trajState);
}  // namespace choreolib
