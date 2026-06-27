// Copyright (c) Choreo contributors

#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "choreo/drive_type.hpp"
#include "choreo/expr.hpp"
#include "choreo/robot_config.hpp"
#include "choreo/variables/variables.hpp"
#include "choreo/codegen/codegen_config.hpp"

namespace choreo {

struct ProjectFile {
  static ProjectFile fromJson(const wpi::util::json& json);
  std::string name;
  std::uint32_t version;
  DriveType type;
  Variables variables;
  RobotConfig config;
  CodeGenConfig codegen;
};

inline void to_json(wpi::util::json& json, const ProjectFile& project) {
  json = wpi::util::json::object(
      "name", project.name, "version", project.version, "type", project.type,
      "variables", project.variables, "config", project.config, "codegen", project.codegen);
}

inline void from_json(const wpi::util::json& json, ProjectFile& project) {
  project.name = json.at("name").get_string();
  project.version = static_cast<std::uint32_t>(json.at("version").get_number());
  project.type = json.at("type").get<DriveType>();
  project.variables = json.at("variables").get<Variables>();
  project.config = json.at("config").get<RobotConfig>();
  project.codegen = json.at("codegen").get<CodeGenConfig>();
}

inline ProjectFile ProjectFile::fromJson(const wpi::util::json& json) {
  ProjectFile value;
  from_json(json, value);
  return value;
}

}  // namespace choreo
