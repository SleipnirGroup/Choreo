// Copyright (c) Choreo contributors

#pragma once

#include <filesystem>
#include <optional>
#include <string>
#include <vector>

struct CliArgs {
  std::filesystem::path chor_path;
  std::filesystem::path traj_path;
  std::filesystem::path output_path;
  std::string progress_url;
  std::string error_message;
};

CliArgs parse_arguments(int argc, char** argv);
