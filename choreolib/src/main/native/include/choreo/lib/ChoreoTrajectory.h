// Copyright (c) Choreo contributors

#pragma once

#include <vector>

#include "ChoreoTrajectoryState.h"

namespace choreolib {
/**
 * Represents a trajectory loaded from Choreo. Made up of ChoreoTrajectoryStates
 */
class ChoreoTrajectory {
 public:
  ChoreoTrajectory() = default;

  /**
   * Constructs a new trajectory from a list of trajectory states
   *
   * @param states a vector containing a list of ChoreoTrajectoryStates
   */
  explicit ChoreoTrajectory(const std::vector<ChoreoTrajectoryState>& states);

  /**
   * Samples the trajectory at the specified timestamp and optionally mirrors if
   *  on the red alliance
   *
   * @param timestamp how far into the trajectory we want to sample
   * @param mirrorForRedAlliance defaults to false. If true, mirrors the state
   *  across the midline of the field
   * @return A ChoreoTrajectoryState that was sampled from this trajectory
   */
  ChoreoTrajectoryState Sample(units::second_t timestamp,
                               bool mirrorForRedAlliance = false);

  /**
   * Returns the initial, non-mirrored pose of the trajectory.
   *
   * @return the initial, non-mirrored pose of the trajectory.
   */
  frc::Pose2d GetInitialPose() const;

  /**
   * Returns the initial, mirrored pose of the trajectory.
   *
   * @return the initial, mirrored pose of the trajectory.
   */
  frc::Pose2d GetFlippedInitialPose() const;

  /**
   * Returns the final, non-mirrored pose of the trajectory.
   *
   * @return the final, non-mirrored pose of the trajectory.
   */
  frc::Pose2d GetFinalPose() const;

  /**
   * Returns the final, mirrored pose of the trajectory.
   *
   * @return the final, mirrored pose of the trajectory.
   */
  frc::Pose2d GetFlippedFinalPose() const;

  /**
   * Returns the total run time of the trajectory
   *
   * @return the total run time of the trajectory
   */
  units::second_t GetTotalTime() const;

  /**
   * Returns a list of robot poses at each sample of the trajectory
   *
   * @return a list of robot poses at each sample of the trajectory
   */
  std::vector<frc::Pose2d> GetPoses() const;

  /**
   * Returns a copy of this trajectory flipped across the midline of the field
   *
   * @return a copy of this trajectory flipped across the midline of the field
   */
  ChoreoTrajectory Flipped() const;

  /**
   * Returns a list of all the states in this trajectory
   *
   * @return a list of all the states in this trajectory
   */
  std::vector<ChoreoTrajectoryState> GetSamples() const;

  /**
   * Sets the samples of this trajectory without constructing a new trajectory
   *
   * @param newSamples a list of all the new states to set this trajectory to
   */
  void SetSamples(const std::vector<ChoreoTrajectoryState>& newSamples);

 private:
  ChoreoTrajectoryState SampleInternal(units::second_t timestamp);
  std::vector<ChoreoTrajectoryState> samples;
};

void to_json(wpi::json& json, const ChoreoTrajectory& traj);
void from_json(const wpi::json& json, ChoreoTrajectory& traj);
}  // namespace choreolib
