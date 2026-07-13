// Copyright (c) Choreo contributors

#include "cli_parser.hpp"

#include <string>

#include <tclap/CmdLine.h>
#include <tclap/MultiArg.h>
#include <tclap/SwitchArg.h>
#include <tclap/ValueArg.h>

CliArgs parse_arguments(int argc, char** argv) {
  CliArgs args;

  try {
    TCLAP::CmdLine cmd(
        "Choreo Generator CLI - Generate optimal trajectories for robot motion planning",
        ' ', "0.1.0");

    // File Options
    TCLAP::ValueArg<std::string> chorArg("", "chor",
                                         "Path to the .chor project file",
                                         false, "",
                                         "path/to/myproject.chor", cmd);

    TCLAP::MultiArg<std::string> trajectoryArg(
        "", "trajectory",
        "Trajectory names to generate (comma-separated or multiple uses)",
        false, "trajectoryName", cmd);
    TCLAP::ValueArg<std::string> outputArg("", "output",
                                        "Path to the output trajectory file",
                                        false, "",
                                        "path/to/output.traj", cmd);
    TCLAP::ValueArg<std::string> progressUrlArg(
      "", "progress-url",
      "Optional WebSocket URL for progress updates (ws://host:port/path)",
      false, "", "ws://localhost:8080/progress", cmd);

    cmd.parse(argc, argv);

    // Extract values
    if (!chorArg.getValue().empty()) {
      args.chor_path =
          std::filesystem::absolute(std::filesystem::path{chorArg.getValue()});
    }



    if (!outputArg.getValue().empty()) {
      args.output_path =
          std::filesystem::absolute(std::filesystem::path{outputArg.getValue()});
    }

    if (!progressUrlArg.getValue().empty()) {
      args.progress_url = progressUrlArg.getValue();
    }

    if (!trajectoryArg.getValue().empty()) {
      args.traj_path = std::filesystem::absolute(
          std::filesystem::path{trajectoryArg.getValue().front()});
    }


    // Validation
    if (args.traj_path.empty()) {
      args.error_message =
          "No trajectory specified. Use --trajectory to specify a trajectory.";
      return args;
    }

    if (args.chor_path.empty()) {
      args.error_message =
          "A project path must be provided with --chor";
      return args;
    }

  } catch (TCLAP::ArgException& e) {
    args.error_message =
        std::string("Command line error: ") + e.error() + " for arg " +
        e.argId();
  } catch (std::exception& e) {
    args.error_message = std::string("Error: ") + e.what();
  }

  return args;
}
