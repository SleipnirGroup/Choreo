// Copyright (c) Choreo contributors

#include "choreo/trajectory/ProjectFile.h"

#include <string>

#include <wpi/json.h>

using namespace choreo;

void choreo::to_json(wpi::json& json, const Expression& exp) {
  json = wpi::json{{"exp", exp.expression}, {"val", exp.val}};
}

void choreo::from_json(const wpi::json& json, Expression& exp) {
  if (json.is_object() && json.size() == 2 && json["exp"].is_string() &&
      json["val"].is_number()) {
    exp.expression = json["exp"].get<std::string>();
    exp.val = json["val"].get<double>();
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
  json = wpi::json{
      {"front", bumpers.front}, {"back", bumpers.back}, {"side", bumpers.side}};
}

void choreo::from_json(const wpi::json& json, Bumpers& bumpers) {
  json.at("front").get_to(bumpers.front);
  json.at("back").get_to(bumpers.back);
  json.at("side").get_to(bumpers.side);
}

void choreo::to_json(wpi::json& json, const Variable& var) {
  json = wpi::json{{"dimension", var.dimension}, {"var", var.var}};
}

void choreo::from_json(const wpi::json& json, Variable& var) {
  json.at("dimension").get_to(var.dimension);
  json.at("var").get_to(var.var);
}

void choreo::to_json(wpi::json& json, const Config& config) {
  json = wpi::json{{"frontLeft", config.frontLeft},
                   {"backLeft", config.backLeft},
                   {"mass", config.mass},
                   {"inertia", config.inertia},
                   {"gearing", config.gearing},
                   {"radius", config.wheelRadius},
                   {"vmax", config.vmax},
                   {"tmax", config.tmax},
                   {"bumper", config.bumpers},
                   {"differentialTrackWidth", config.differentialTrackWidth}};
}

void choreo::from_json(const wpi::json& json, Config& config) {
  json.at("frontLeft").get_to(config.frontLeft);
  json.at("backLeft").get_to(config.backLeft);
  json.at("mass").get_to<Expression>(config.mass);
  json.at("inertia").get_to(config.inertia);
  json.at("gearing").get_to(config.gearing);
  json.at("radius").get_to(config.wheelRadius);
  json.at("vmax").get_to(config.vmax);
  json.at("tmax").get_to(config.tmax);
  json.at("bumper").get_to(config.bumpers);
  json.at("differentialTrackWidth").get_to(config.differentialTrackWidth);
}

void choreo::to_json(wpi::json& json, const ProjectFile& projectFile) {
  json = wpi::json{
      {"name", projectFile.name},
      {"version", projectFile.version},
      {"type", projectFile.type},
      {"variables", wpi::json{{"expressions", projectFile.expressions},
                              {"poses", projectFile.poses}}},
      {"config", projectFile.config},
      {"generationFeatures", wpi::json::array()}};
}

void choreo::from_json(const wpi::json& json, ProjectFile& projectFile) {
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
