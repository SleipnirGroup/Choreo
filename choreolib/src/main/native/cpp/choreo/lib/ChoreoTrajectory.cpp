#include "choreo/lib/ChoreoTrajectory.h"

using namespace choreolib;

ChoreoTrajectory::ChoreoTrajectory(
		const std::vector<ChoreoTrajectoryState> &states) : samples(states) {
}

ChoreoTrajectoryState ChoreoTrajectory::SampleInternal(
		units::second_t timestamp) {
	if (timestamp < samples[0].timestamp) {
		return samples[0];
	}
	if (timestamp > GetTotalTime()) {
		return samples[samples.size() - 1];
	}

	std::size_t low = 0;
	std::size_t high = samples.size() - 1;

	while (low != high) {
		std::size_t mid = (low + high) / 2;
		if (samples[mid].timestamp < timestamp) {
			low = mid + 1;
		} else {
			high = mid;
		}
	}

	if (low == 0) {
		return samples[low];
	}

	ChoreoTrajectoryState behindState = samples[low - 1];
	ChoreoTrajectoryState aheadState = samples[low];

	if ((aheadState.timestamp - behindState.timestamp)
			< units::second_t { 1e-6 }) {
		return aheadState;
	}

	return behindState.Interpolate(aheadState, timestamp);
}

ChoreoTrajectoryState ChoreoTrajectory::Sample(units::second_t timestamp) {
	return Sample(timestamp, false);
}

ChoreoTrajectoryState ChoreoTrajectory::Sample(units::second_t timestamp,
		bool mirrorForRedAlliance) {
	ChoreoTrajectoryState state = SampleInternal(timestamp);
	return mirrorForRedAlliance ? state.Flipped() : state;
}

frc::Pose2d ChoreoTrajectory::GetInitialPose() const {
	return samples[0].GetPose();
}

frc::Pose2d ChoreoTrajectory::GetFinalPose() const {
	return samples[samples.size() - 1].GetPose();
}

units::second_t ChoreoTrajectory::GetTotalTime() const {
	return samples[samples.size() - 1].timestamp;
}

std::vector<frc::Pose2d> ChoreoTrajectory::GetPoses() const {
	std::vector < frc::Pose2d > poses;

	for (const auto &sample : samples) {
		poses.emplace_back(sample.GetPose());
	}

	return poses;
}

ChoreoTrajectory ChoreoTrajectory::Flipped() const {
	std::vector < ChoreoTrajectoryState > flippedStates;
	for (const auto &state : samples) {
		flippedStates.emplace_back(state.Flipped());
	}
	return ChoreoTrajectory(flippedStates);
}
