#include "choreo/lib/Choreo.h"
#include <frc/Filesystem.h>
#include <wpi/MemoryBuffer.h>
#include <wpi/json.h>

using namespace choreolib;

ChoreoTrajectory Choreo::GetTrajectory(std::string trajName) {
	std::string trajDir = frc::filesystem::GetDeployDirectory() + "choreo";
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
