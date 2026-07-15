// Copyright (c) Choreo contributors

#include <iterator>
#include <numbers>
#include <filesystem>
#include <functional>
#include <fstream>
#include <optional>
#include <print>
#include <ranges>
#include <stdexcept>
#include <string>
#include <type_traits>
#include <variant>
#include <vector>

#include <choreo/constraint.hpp>
#include <choreo/constraint_data/constraint_data.hpp>
#include <choreo/expr.hpp>
#include <choreo/gradient.hpp>
#include <choreo/parameters.hpp>
#include <choreo/project.hpp>
#include <choreo/renderer.hpp>
#include <choreo/robot_config.hpp>
#include <choreo/trajectory/swerve_sample.hpp>
#include <choreo/variables/variable.hpp>
#include <choreo/variables/variables.hpp>
#include <choreo/waypoint.hpp>
#include <generator.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>
#include <wpi/math/geometry/Pose2d.hpp>
#include <wpi/util/json.hpp>

#include "choreo/drive_type.hpp"
#include "choreo/trajectory.hpp"
#include "cli_parser.hpp"
#include <progress_update_sender/client.hpp>
#include "segment.hpp"
#include "split_to_segments.hpp"

///
/// @brief Validates the input trajectory and project files for trajectory generation.
/// @param project The project file.
/// @param trajectory The trajectory file.
/// @throws std::runtime_error if the input trajectory is invalid.
void validate_generation_input(const choreo::ProjectFile& project,
                               const choreo::TrajectoryFile& trajectory) {
  const auto& params = trajectory.params;
  if (params.waypoints.size() < 2) {
    throw std::runtime_error(
        "Input trajectory has " + std::to_string(params.waypoints.size()) +
        " waypoint(s); at least 2 are required for generation");
  }

  size_t invalid_enabled_constraints = 0;
  for (const auto& constraint : params.constraints) {
    if (!constraint.enabled) {
      continue;
    }
    if (!constraint.toConstraintIDX(params.waypoints).has_value()) {
      invalid_enabled_constraints++;
    }
  }
  if (invalid_enabled_constraints > 0) {
    throw std::runtime_error(
        "Input trajectory contains " +
        std::to_string(invalid_enabled_constraints) +
        " enabled constraint(s) with invalid waypoint references");
  }

  if (trajectory.trajectory.has_value()) {
    const bool sample_type_matches_project =
        (project.type == choreo::DriveType::Swerve &&
         std::holds_alternative<
             choreo::Trajectory<choreo::SwerveDriveType>>(
             *trajectory.trajectory)) ||
        (project.type == choreo::DriveType::Differential &&
         std::holds_alternative<
             choreo::Trajectory<choreo::DifferentialDriveType>>(
             *trajectory.trajectory));

    if (!sample_type_matches_project) {
      throw std::runtime_error(
          "Input trajectory sample_type does not match project drive type");
    }
  }
}


/// @brief Generates a trajectory file using the specified trajectory generator.
/// @tparam Generator The trajectory generator type.
/// @param chor The project file.
/// @param originalTrajectory The original trajectory file.
/// @return The generated trajectory file, ready to be written to file, sent to a client, etc.
template <choreo::ChoreoTrajectoryGenerator Generator>
choreo::TrajectoryFile generate(const choreo::ProjectFile& chor,
                                const choreo::TrajectoryFile& originalTrajectory,
                                const choreo::progress_update_sender::Client* sender = nullptr) {
                                  //Intentionally make two copies of the trajectory file
  auto traj_unscratch = choreo::TrajectoryFile{originalTrajectory};
  using Sample = typename Generator::Sample;
  std::function<void(const std::vector<Sample>&)> progress_callback;
  if (sender != nullptr) {
    progress_callback = [sender](const std::vector<Sample>& samples) {
      sender->sendIncompleteTrajectory(samples);
    };
  }

  Generator generator(choreo::ProjectFile{chor}, choreo::TrajectoryFile{traj_unscratch},
                      std::move(progress_callback));
  
  auto samplesExp = generator.generate();
  if (!samplesExp) {
    throw std::runtime_error("Trajectory generation failed");
  }
  auto samples = *samplesExp;
  std::vector<choreo::Segment> segments = generator.get_segments();

  // create a vector of timestamps for the interval matching each waypoint
  std::vector<wpi::units::second_t> waypoint_timestamps;
  waypoint_timestamps.reserve(segments.size());
  size_t timestamp_index = 0;
  for (const auto& segment: segments) {
    if (timestamp_index >= samples.size()) {
      throw std::runtime_error("Segment sample index " +
                               std::to_string(timestamp_index) +
                               " out of range for " +
                               std::to_string(samples.size()) +
                               " samples");
    }
    auto intervals = segment.start.intervals;
    waypoint_timestamps.push_back(samples[timestamp_index].time);
    std::println("Timestamp for interval {}: {}", timestamp_index, waypoint_timestamps.back());
    timestamp_index += intervals;
  }

    using DriveType = typename decltype(generator)::DriveType;
    auto wpilibTrajectory = typename DriveType::WPILibTrajectory{samples};
    auto output = choreo::Trajectory<DriveType>(waypoint_timestamps, wpilibTrajectory, {});
    traj_unscratch.trajectory = output;
    traj_unscratch.snapshot = originalTrajectory.params;
    traj_unscratch.config = chor.config;
    
    // Should be a no-op because this doesn't otherwise change.
    traj_unscratch.events = originalTrajectory.events;
    for (auto& event : traj_unscratch.events) {
      //Update the timestamp for the event based on the waypoint timestamps and offset
      // Assuming the event has a timestamp offset, update it based on the waypoint timestamps
      event.from.updateTimestamp(originalTrajectory.params.waypoints,
                 waypoint_timestamps);
    }

    std::println("Was trajectory outdated? {}", originalTrajectory.must_be_generated(chor));
    std::println("original dt params: {}", originalTrajectory.params.target_dt.val.value());
    std::println("original dt snapshot: {}", originalTrajectory.snapshot->target_dt.val.value());
    std::println("new dt snapshot: {}", traj_unscratch.snapshot->target_dt.val.value());
    std::println("new dt: {}", traj_unscratch.params.target_dt.val.value());

    std::println("Is trajectory still outdated? {}", traj_unscratch.must_be_generated(chor));
  return traj_unscratch;
}

/// @brief Reads the project and trajectory files from the specified paths and generates a new trajectory file.
/// @param args The command line arguments containing the paths to the project and trajectory files.
/// @return The generated trajectory file.
/// @throws std::runtime_error if the input files are invalid or generation fails.
choreo::TrajectoryFile read_and_generate(
    const CliArgs& args,
    const choreo::progress_update_sender::Client* sender = nullptr) {
  std::println("Generating trajectories from: {}", args.chor_path.string());
  std::println("Trajectory to generate: {}", args.traj_path.string());
  if (sender != nullptr) {
    sender->sendDiagnosticText("generator: loading input files");
  }
  // Read the ProjectFile and TrajectoryFile from the specified paths
  std::string chor_contents;
  std::string traj_contents;
  {
    std::ifstream chor_file(args.chor_path);
    chor_contents = std::string(std::istreambuf_iterator<char>(chor_file),
                                std::istreambuf_iterator<char>());
    std::ifstream traj_file(args.traj_path);
    traj_contents = std::string(std::istreambuf_iterator<char>(traj_file),
                                std::istreambuf_iterator<char>());
  }
  choreo::ProjectFile chor = choreo::ProjectFile::fromJson(
      wpi::util::json::parse_or_throw(std::string_view{chor_contents}));
  choreo::TrajectoryFile traj = choreo::TrajectoryFile::fromJson(
      wpi::util::json::parse_or_throw(std::string_view{traj_contents}));

  validate_generation_input(chor, traj);
  
  // This copy will not be modified unless generation is successful.
  auto driveType = chor.type;
  switch (driveType) {
    case choreo::DriveType::Swerve: 
    return generate<
  choreo::TrajectoryGenerator<choreo::SwerveDriveType, trajopt::SwerveSolution,
                              trajopt::SwerveDrivetrain,
                              trajopt::SwerveTrajectoryGenerator, trajopt::SwerveTrajectory>>(chor, traj, sender);
    case choreo::DriveType::Differential: 
    return generate<
  choreo::TrajectoryGenerator<choreo::DifferentialDriveType, trajopt::DifferentialSolution,
                              trajopt::DifferentialDrivetrain,
                              trajopt::DifferentialTrajectoryGenerator, trajopt::DifferentialTrajectory>>(chor, traj, sender);
    default:
      throw std::runtime_error("Unsupported drive type");
  }
}

int main(int argc, char** argv) {
    std::println("Choreo Generator CLI");

    
    try {
      CliArgs args = parse_arguments(argc, argv);
      std::optional<choreo::progress_update_sender::Client> progress_sender;

      if (!args.progress_url.empty()) {
        progress_sender.emplace();
        progress_sender->open(args.progress_url);
        progress_sender->sendDiagnosticText("generator: progress sender initialized");
      }

      if (!args.error_message.empty()) {
        std::println(stderr, "Error: {}", args.error_message);
        if (progress_sender.has_value()) {
          progress_sender->sendError(args.error_message);
        }
        return 1;
      }
      const choreo::TrajectoryFile traj =
          read_and_generate(args,
                            progress_sender.has_value() ? &*progress_sender : nullptr);

      // at this point the traj is fully edited. Send it where it needs to go.
      const auto serialized_traj = wpi::util::json(traj).to_string();

      if (!args.output_path.empty()) {
        std::ofstream output_file(args.output_path);
        output_file << wpi::util::json(traj).to_string_pretty();
      }

      if (progress_sender.has_value()) {
        progress_sender->sendCompleteTrajectory(serialized_traj);
      }
      std::println("Trajectory generation complete");
      return 0;
    } catch (const std::exception& e) {
      std::println(stderr, "Generator runtime error: {}", e.what());
      return 2;
    } catch (...) {
      std::println(stderr, "Generator runtime error: unknown exception");
      return 3;
    }
}