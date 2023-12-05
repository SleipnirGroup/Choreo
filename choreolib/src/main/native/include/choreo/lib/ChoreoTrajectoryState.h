#pragma once

#include <frc/geometry/Pose2d.h>
#include <frc/kinematics/ChassisSpeeds.h>

namespace choreolib {
class ChoreoTrajectoryState {
public:
	ChoreoTrajectoryState();
	ChoreoTrajectoryState(units::second_t t, units::meter_t x, units::meter_t y,
			units::radian_t heading, units::meters_per_second_t xVel,
			units::meters_per_second_t yVel,
			units::radians_per_second_t angularVel);

	frc::Pose2d GetPose() const;
	frc::ChassisSpeeds GetChassisSpeeds() const;
	ChoreoTrajectoryState Interpolate(const ChoreoTrajectoryState &endValue,
			units::second_t t) const;
	std::array<double, 7> AsArray() const;
	ChoreoTrajectoryState Flipped() const;

	const units::second_t timestamp;
	const units::meter_t x;
	const units::meter_t y;
	const units::radian_t heading;
	const units::meters_per_second_t velocityX;
	const units::meters_per_second_t velocityY;
	const units::radians_per_second_t angularVelocity;

private:
	static constexpr units::meter_t fieldWidth { 16.55445 };
};
} // namespace choreolib
