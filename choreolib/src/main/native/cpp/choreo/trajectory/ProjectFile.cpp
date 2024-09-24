// Copyright (c) Choreo contributors

#include "choreo/trajectory/ProjectFile.h"

#include <wpi/json.h>

using namespace choreo;

void choreo::to_json(wpi::json& json, const Expression& exp) {
  json = wpi::json{exp.exp, exp.val};
}

void choreo::from_json(const wpi::json& json, Expression& exp) {
  if (json.is_array() && json.size() == 2 && json[0].is_string() &&
      json[1].is_number()) {
    exp.exp = json[0].get<std::string>();
    exp.val = json[1].get<double>();
  } else {
    throw std::runtime_error("Invalid measurement format");
  }
}

void choreo::to_json(wpi::json& json, const XYExpression& xyexp) {
  json = wpi::json{{"x", xyexp.x}, {"y", xyexp.y}};
}
void choreo::from_json(const wpi::json& json, XYExpression& xyexp) {
  json.at("x").get_to(xyexp.x);
  json.at("y").get_to(xyexp.y);
}

void choreo::to_json(wpi::json& json, const Pose& pose) {
  json = wpi::json{{"x", pose.x}, {"y", pose.y}, {"heading", pose.heading}};
}

void choreo::from_json(const wpi::json& j, Pose& pose) {
  j.at("x").get_to(pose.x);
  j.at("y").get_to(pose.y);
  j.at("heading").get_to(pose.heading);
}

void choreo::to_json(wpi::json& json, const Bumpers& bumpers) {
  json = wpi::json{{"front", bumpers.front},
                   {"left", bumpers.left},
                   {"back", bumpers.back},
                   {"right", bumpers.right}};
}

void choreo::from_json(const wpi::json& json, Bumpers& bumpers) {
  json.at("front").get_to(bumpers.front);
  json.at("left").get_to(bumpers.left);
  json.at("back").get_to(bumpers.back);
  json.at("right").get_to(bumpers.right);
}

void choreo::to_json(wpi::json& json, const Variable& var) {
  json = wpi::json{{"dimension", var.dimension}, {"var", var.var}};
}

void choreo::from_json(const wpi::json& json, Variable& var) {
  json.at("dimension").get_to(var.dimension);
  json.at("var").get_to(var.var);
}

void choreo::to_json(wpi::json& json, const Config& config) {
  json = wpi::json{{"modules", config.modules},    {"mass", config.mass},
                   {"inertia", config.inertia},    {"gearing", config.gearing},
                   {"radius", config.wheelRadius}, {"vmax", config.vmax},
                   {"tmax", config.tmax},          {"bumper", config.bumpers}};
}

void choreo::from_json(const wpi::json& json, Config& config) {
  json.at("modules").get_to(config.modules);
  json.at("mass").get_to<Expression>(config.mass);
  json.at("inertia").get_to(config.inertia);
  json.at("gearing").get_to(config.gearing);
  json.at("radius").get_to(config.wheelRadius);
  json.at("vmax").get_to(config.vmax);
  json.at("tmax").get_to(config.tmax);
  json.at("bumper").get_to(config.bumpers);
}

void choreo::to_json(wpi::json& json,
                                 const ProjectFile& projectFile) {
  json = wpi::json{
      {"name", projectFile.name},
      {"version", projectFile.version},
      {"type", projectFile.type},
      {"variables", wpi::json{{"expressions", projectFile.expressions},
                              {"poses", projectFile.poses}}},
      {"config", wpi::json{projectFile.config}},
      {"generationFeatures", wpi::json::array()}};
}

void choreo::from_json(const wpi::json& json,
                                   ProjectFile& projectFile) {
  json.at("name").get_to(projectFile.name);
  json.at("version").get_to(projectFile.version);
  json.at("type").get_to(projectFile.type);

  const auto& variables = json.at("variables");
  if (variables.contains("expressions")) {
    for (const auto& [key, value] : variables["expressions"].items()) {
      projectFile.expressions[key] = value.get<Variable>();
    }
  }

  if (variables.contains("poses")) {
    for (const auto& [key, value] : variables["poses"].items()) {
      projectFile.poses[key] = value.get<Pose>();
    }
  }

  json.at("config").get_to(projectFile.config);
}
