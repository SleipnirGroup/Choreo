#pragma once

#include "ChoreoTrajectoryState.h"

namespace choreolib {
class ChoreoTrajectory {
public:
	ChoreoTrajectory() = default;
	ChoreoTrajectory(const std::vector<ChoreoTrajectoryState> &states);
	ChoreoTrajectoryState Sample(units::second_t timestamp);
	ChoreoTrajectoryState Sample(units::second_t timestamp,
			bool mirrorForRedAlliance);
	frc::Pose2d GetInitialPose() const;
	frc::Pose2d GetFinalPose() const;
	units::second_t GetTotalTime() const;
	std::vector<frc::Pose2d> GetPoses() const;
	ChoreoTrajectory Flipped() const;

private:
	ChoreoTrajectoryState SampleInternal(units::second_t timestamp);
	std::vector<ChoreoTrajectoryState> samples { };
};
}
