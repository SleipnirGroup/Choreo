// Copyright (c) Choreo contributors

#include "choreo/lib/ChoreoTrajectory.h"

#include <units/math.h>
#include <wpi/json.h>

using namespace choreolib;

ChoreoTrajectory::ChoreoTrajectory(
    const std::vector<ChoreoTrajectoryState>& states)
    : samples(states) {}

ChoreoTrajectoryState ChoreoTrajectory::SampleInternal(
    units::second_t timestamp) {
  if (samples.empty()) {
    throw std::runtime_error(
        "Trajectory cannot be sampled if it has no states.");
  }

  if (timestamp <= samples.front().timestamp) {
    return samples.front();
  }
  if (timestamp >= GetTotalTime()) {
    return samples.back();
  }

  // Use binary search to get the element with a timestamp no less than the
  // requested timestamp. This starts at 1 because we use the previous state
  // later on for interpolation.
  auto sample = std::lower_bound(
      samples.cbegin() + 1, samples.cend(), timestamp,
      [](const auto& a, const auto& b) { return a.timestamp < b; });

  auto prevSample = sample - 1;

  // The sample's timestamp is now greater than or equal to the requested
  // timestamp. If it is greater, we need to interpolate between the
  // previous state and the current state to get the exact state that we
  // want.

  // If the difference in states is negligible, then we are spot on!
  if (units::math::abs(sample->timestamp - prevSample->timestamp) < 1E-9_s) {
    return *sample;
  }
  // Interpolate between the two states for the state that we want.
  return prevSample->Interpolate(
      *sample, (timestamp - prevSample->timestamp) /
                   (sample->timestamp - prevSample->timestamp));
}

ChoreoTrajectoryState ChoreoTrajectory::Sample(units::second_t timestamp,
                                               bool mirrorForRedAlliance) {
  ChoreoTrajectoryState state = SampleInternal(timestamp);
  return mirrorForRedAlliance ? state.Flipped() : state;
}

frc::Pose2d ChoreoTrajectory::GetInitialPose() const {
  return samples.front().GetPose();
}

frc::Pose2d ChoreoTrajectory::GetFlippedInitialPose() const {
  return samples.front().Flipped().GetPose();
}

frc::Pose2d ChoreoTrajectory::GetFinalPose() const {
  return samples.back().GetPose();
}

frc::Pose2d ChoreoTrajectory::GetFlippedFinalPose() const {
  return samples.back().Flipped().GetPose();
}

units::second_t ChoreoTrajectory::GetTotalTime() const {
  return samples.back().timestamp;
}

std::vector<frc::Pose2d> ChoreoTrajectory::GetPoses() const {
  std::vector<frc::Pose2d> poses;

  for (const auto& sample : samples) {
    poses.emplace_back(sample.GetPose());
  }

  return poses;
}

ChoreoTrajectory ChoreoTrajectory::Flipped() const {
  std::vector<ChoreoTrajectoryState> flippedStates;
  for (const auto& state : samples) {
    flippedStates.emplace_back(state.Flipped());
  }
  return ChoreoTrajectory(flippedStates);
}

std::vector<ChoreoTrajectoryState> ChoreoTrajectory::GetSamples() const {
  return samples;
}

void ChoreoTrajectory::SetSamples(
    const std::vector<ChoreoTrajectoryState>& newSamples) {
  samples = newSamples;
}

void choreolib::to_json(wpi::json& json, const ChoreoTrajectory& traj) {
  json = wpi::json{{"samples", traj.GetSamples()}};
}

void choreolib::from_json(const wpi::json& json, ChoreoTrajectory& traj) {
  traj.SetSamples(json.at("samples").get<std::vector<ChoreoTrajectoryState>>());
}
