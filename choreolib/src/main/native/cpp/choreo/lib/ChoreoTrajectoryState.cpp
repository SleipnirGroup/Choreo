#include "choreo/lib/ChoreoTrajectoryState.h"

#include <frc/geometry/Twist2d.h>
#include <numbers>

using namespace choreolib;

namespace frc {
static constexpr frc::Pose2d Interpolate(const frc::Pose2d &startValue,
		const frc::Pose2d &endValue, double t) {
	if (t < 0) {
		return startValue;
	} else if (t >= 1) {
		return endValue;
	} else {
		frc::Twist2d twist { startValue.Log(endValue) };
		frc::Twist2d scaledTwist = twist * t;
		return startValue.Exp(scaledTwist);
	}
}
} // namespace frc

ChoreoTrajectoryState::ChoreoTrajectoryState() : timestamp(0_s), x(0_m), y(0_m), heading(
		0_rad), velocityX(0_mps), velocityY(0_mps), angularVelocity(0_rad_per_s) {
}

ChoreoTrajectoryState::ChoreoTrajectoryState(units::second_t t,
		units::meter_t x, units::meter_t y, units::radian_t heading,
		units::meters_per_second_t xVel, units::meters_per_second_t yVel,
		units::radians_per_second_t angularVel) : timestamp(t), x(x), y(y), heading(
		heading), velocityX(xVel), velocityY(yVel), angularVelocity(angularVel) {
}

frc::Pose2d ChoreoTrajectoryState::GetPose() const {
	return frc::Pose2d { x, y, frc::Rotation2d { heading } };
}

frc::ChassisSpeeds ChoreoTrajectoryState::GetChassisSpeeds() const {
	return frc::ChassisSpeeds { velocityX, velocityY, angularVelocity };
}

ChoreoTrajectoryState ChoreoTrajectoryState::Interpolate(
		const ChoreoTrajectoryState &endValue, units::second_t t) const {
	units::scalar_t scale = (t - timestamp) / (endValue.timestamp - timestamp);
	frc::Pose2d interpPose = frc::Interpolate(GetPose(), endValue.GetPose(),
			scale);
	return ChoreoTrajectoryState { 0_s, interpPose.X(), interpPose.Y(),
			interpPose.Rotation().Radians(), units::meters_per_second_t {
					std::lerp(velocityX.value(), endValue.velocityY.value(),
							scale) }, units::meters_per_second_t { std::lerp(
					velocityY.value(), endValue.velocityY.value(), scale) },
			units::radians_per_second_t { std::lerp(angularVelocity.value(),
					endValue.angularVelocity.value(), scale) } };
}

std::array<double, 7> ChoreoTrajectoryState::AsArray() const {
	return {timestamp.value(), x.value(), y.value(),
		heading.value(), velocityX.value(), velocityY.value(),
		angularVelocity.value()};
}

ChoreoTrajectoryState ChoreoTrajectoryState::Flipped() const {
	return ChoreoTrajectoryState { timestamp, fieldWidth - x, y,
			units::radian_t { std::numbers::pi } - heading, velocityX * -1,
			velocityY, angularVelocity * -1 };
}
