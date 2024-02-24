// Copyright (c) Choreo contributors

#include "choreo/lib/Choreo.h"

#include <frc/DriverStation.h>
#include <frc/Filesystem.h>
#include <frc/Timer.h>
#include <frc2/command/FunctionalCommand.h>
#include <wpi/MemoryBuffer.h>
#include <wpi/json.h>

#include <filesystem>
#include <numbers>
#include <regex>
#include <vector>

#include "choreo/lib/ChoreoSwerveCommand.h"

using namespace choreolib;

ChoreoTrajectory Choreo::GetTrajectory(std::string_view trajName) {
  std::string trajFileName = fmt::format(
      "{}/choreo/{}.traj", frc::filesystem::GetDeployDirectory(), trajName);

  std::error_code ec;
  std::unique_ptr<wpi::MemoryBuffer> fileBuffer =
      wpi::MemoryBuffer::GetFile(trajFileName, ec);
  if (fileBuffer == nullptr || ec) {
    throw std::runtime_error(fmt::format("Cannot open file: {}", trajFileName));
  }

  wpi::json json = wpi::json::parse(fileBuffer->GetCharBuffer());

  ChoreoTrajectory traj;
  choreolib::from_json(json, traj);
  return traj;
}

std::vector<ChoreoTrajectory> Choreo::GetTrajectoryGroup(
    std::string_view trajName) {
  const std::filesystem::path trajDir{
      fmt::format("{}/choreo", frc::filesystem::GetDeployDirectory())};
  int segmentCount = 0;
  for (const auto& dir_entry : std::filesystem::directory_iterator{trajDir}) {
    if (dir_entry.is_regular_file() &&
        std::regex_match(
            dir_entry.path().filename().string(),
            std::regex(fmt::format("{}\\.\\d+\\.traj", trajName)))) {
      ++segmentCount;
    }
  }
  std::vector<ChoreoTrajectory> group;
  group.reserve(segmentCount);
  for (int i = 1; i <= segmentCount; ++i) {
    try {
      group.push_back(Choreo::GetTrajectory(fmt::format("{}.{}", trajName, i)));
    } catch (const std::exception&) {
      throw std::runtime_error(
          fmt::format("Cannot open file: {}.{}.traj", trajName, i));
    }
  }
  return group;
}

frc2::CommandPtr Choreo::ChoreoSwerveCommandFactory(
    ChoreoTrajectory trajectory, std::function<frc::Pose2d()> poseSupplier,
    frc::PIDController xController, frc::PIDController yController,
    frc::PIDController rotationController,
    std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
    std::function<bool(void)> mirrorTrajectory,
    frc2::Requirements requirements) {
  return ChoreoSwerveCommand(trajectory, poseSupplier,
                             ChoreoSwerveController(xController, yController,
                                                    rotationController),
                             outputChassisSpeeds, mirrorTrajectory,
                             requirements)
      .ToPtr();
}

frc2::CommandPtr Choreo::ChoreoSwerveCommandFactory(
    ChoreoTrajectory trajectory, std::function<frc::Pose2d()> poseSupplier,
    ChoreoControllerFunction controller,
    std::function<void(frc::ChassisSpeeds)> outputChassisSpeeds,
    std::function<bool(void)> mirrorTrajectory,
    frc2::Requirements requirements) {
  return ChoreoSwerveCommand(trajectory, poseSupplier, controller,
                             outputChassisSpeeds, mirrorTrajectory,
                             requirements)
      .ToPtr();
}

ChoreoControllerFunction Choreo::ChoreoSwerveController(
    frc::PIDController xController, frc::PIDController yController,
    frc::PIDController rotationController) {
  rotationController.EnableContinuousInput(-std::numbers::pi, std::numbers::pi);
  return [xController, yController, rotationController](
             frc::Pose2d pose, ChoreoTrajectoryState referenceState) mutable {
    units::meters_per_second_t xFF = referenceState.velocityX;
    units::meters_per_second_t yFF = referenceState.velocityY;
    units::radians_per_second_t rotationFF = referenceState.angularVelocity;

    units::meters_per_second_t xFeedback{
        xController.Calculate(pose.X().value(), referenceState.x.value())};
    units::meters_per_second_t yFeedback{
        yController.Calculate(pose.Y().value(), referenceState.y.value())};
    units::radians_per_second_t rotationFeedback{rotationController.Calculate(
        pose.Rotation().Radians().value(), referenceState.heading.value())};

    return frc::ChassisSpeeds::FromFieldRelativeSpeeds(
        xFF + xFeedback, yFF + yFeedback, rotationFF + rotationFeedback,
        pose.Rotation());
  };
}
