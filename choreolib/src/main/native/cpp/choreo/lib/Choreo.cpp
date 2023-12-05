#include "choreo/lib/Choreo.h"
#include <frc/Filesystem.h>
#include <wpi/MemoryBuffer.h>
#include <wpi/json.h>
#include <frc2/command/FunctionalCommand.h>
#include <frc/Timer.h>
#include <frc/DriverStation.h>
#include <numbers>

using namespace choreolib;

ChoreoTrajectory Choreo::GetTrajectory(std::string trajName) {
	std::string trajDir = frc::filesystem::GetDeployDirectory() + "/choreo/";
	std::string trajFileName = trajDir + trajName + ".traj";

	std::error_code ec;
	std::unique_ptr < wpi::MemoryBuffer > fileBuffer =
			wpi::MemoryBuffer::GetFile(trajFileName, ec);
	if (fileBuffer == nullptr || ec) {
		throw std::runtime_error(
				fmt::format("Cannot open file: {}", trajFileName));
	}

	wpi::json json = wpi::json::parse(fileBuffer->GetCharBuffer());

	ChoreoTrajectory traj;
	choreolib::from_json(json, traj);
	return traj;
}

frc2::CommandPtr Choreo::ChoreoSwerveCommand(ChoreoTrajectory trajectory,
		std::function<frc::Pose2d()> poseSupplier,
		frc::PIDController xController, frc::PIDController yController,
		frc::PIDController rotationController,
		std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
		bool useAllianceColor, frc2::Requirements requirements) {
	return ChoreoSwerveCommand(trajectory, poseSupplier,
			ChoreoSwerveController(xController, yController,
					rotationController), outputChassisSpeeds, useAllianceColor,
			requirements);
}

frc2::CommandPtr Choreo::ChoreoSwerveCommand(ChoreoTrajectory trajectory,
		std::function<frc::Pose2d()> poseSupplier,
		ChoreoControllerFunction controller,
		std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
		bool useAllianceColor, frc2::Requirements requirements) {
	frc::Timer timer;
	return frc2::FunctionalCommand([timer]() mutable {
		timer.Restart();
	}
			,
			[timer, trajectory, poseSupplier, controller, useAllianceColor,
					outputChassisSpeeds]() mutable {
				bool mirror = false;
				if (useAllianceColor) {
					std::optional < frc::DriverStation::Alliance > alliance =
							frc::DriverStation::GetAlliance();
					mirror = alliance.has_value()
							&& alliance.value()
									== frc::DriverStation::Alliance::kRed;
				}
				outputChassisSpeeds(
						controller(poseSupplier(),
								trajectory.Sample(timer.Get(), mirror)));
			},
			[timer, outputChassisSpeeds](bool interrupted) mutable {
				timer.Stop();
				if (interrupted) {
					outputChassisSpeeds(frc::ChassisSpeeds { });
				}
			},
			[timer, trajectory]() mutable {
				return timer.HasElapsed(trajectory.GetTotalTime());
			},
			requirements).ToPtr();
}

ChoreoControllerFunction Choreo::ChoreoSwerveController(
		frc::PIDController xController, frc::PIDController yController,
		frc::PIDController rotationController) {
	rotationController.EnableContinuousInput(-std::numbers::pi,
			std::numbers::pi);
	return [xController, yController, rotationController](frc::Pose2d pose,
			ChoreoTrajectoryState referenceState) mutable {
		units::meters_per_second_t xFF = referenceState.velocityX;
		units::meters_per_second_t yFF = referenceState.velocityY;
		units::radians_per_second_t rotationFF = referenceState.angularVelocity;

		units::meters_per_second_t xFeedback { xController.Calculate(
				pose.X().value(), referenceState.x.value()) };
		units::meters_per_second_t yFeedback { yController.Calculate(
				pose.Y().value(), referenceState.y.value()) };
		units::radians_per_second_t rotationFeedback {
				rotationController.Calculate(pose.Rotation().Radians().value(),
						referenceState.heading.value()) };

		return frc::ChassisSpeeds::FromFieldRelativeSpeeds(xFF + xFeedback,
				yFF + yFeedback, rotationFF + rotationFeedback, pose.Rotation());
	};
}
