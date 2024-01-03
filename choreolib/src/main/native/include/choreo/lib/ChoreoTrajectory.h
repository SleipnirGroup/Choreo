// Copyright (c) Choreo contributors

#pragma once

#include <vector>

#include "ChoreoTrajectoryState.h"

namespace choreolib {
class ChoreoTrajectory {
 public:
  ChoreoTrajectory() = default;
  explicit ChoreoTrajectory(const std::vector<ChoreoTrajectoryState>& states);
  ChoreoTrajectoryState Sample(units::second_t timestamp);
  ChoreoTrajectoryState Sample(units::second_t timestamp,
                               bool mirrorForRedAlliance);
  frc::Pose2d GetInitialPose() const;
  frc::Pose2d GetFinalPose() const;
  units::second_t GetTotalTime() const;
  std::vector<frc::Pose2d> GetPoses() const;
  ChoreoTrajectory Flipped() const;
  std::vector<ChoreoTrajectoryState> GetSamples() const;
  void SetSamples(const std::vector<ChoreoTrajectoryState>& newSamples);

 private:
  ChoreoTrajectoryState SampleInternal(units::second_t timestamp);
  std::vector<ChoreoTrajectoryState> samples{};
};

void to_json(wpi::json& json, const ChoreoTrajectory& traj);
void from_json(const wpi::json& json, ChoreoTrajectory& traj);
}  // namespace choreolib
