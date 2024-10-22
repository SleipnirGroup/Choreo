// Copyright (c) Choreo contributors

#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include <wpi/json_fwd.h>

namespace choreo {

/**
 * A representation of an expression. An equation and its value.
 */
struct Expression {
  /// The equation.
  std::string expression;

  /// The value.
  double val = 0.0;

  /**
   * Expression equality operator.
   *
   * @param other The other expression.
   * @return True on equality.
   */
  bool operator==(const Expression& other) const {
    return expression == other.expression && std::abs(val - other.val) < 1e-6;
  }
};

/**
 * An x-y pair of expressions.
 */
struct XYExpression {
  /// The x expression.
  Expression x;

  /// The y expression.
  Expression y;

  /**
   * XYExpression equality operator.
   *
   * @return True on equality.
   */
  bool operator==(const XYExpression&) const = default;
};

/**
 * Expressions comprising a pose.
 */
struct Pose {
  /// The x expression.
  Expression x;

  /// The y expression.
  Expression y;

  /// The heading expression.
  Expression heading;

  /**
   * Pose equality operator.
   *
   * @return True for equality.
   */
  bool operator==(const Pose&) const = default;
};

/**
 * A variable expression.
 */
struct Variable {
  /// The variable's dimension.
  std::string dimension;

  /// The variable's expression.
  Expression var;

  /**
   * Variable equality operator.
   *
   * @return True on equality.
   */
  bool operator==(const Variable&) const = default;
};

/**
 * A collection of expressions representing the distance of the bumpers from the
 * center of the robot.
 */
struct Bumpers {
  /// The front bumper expression.
  Expression front;

  /// The back bumper expression.
  Expression back;

  /// The side bumper expression.
  Expression side;

  /**
   * Bumpers equality operator.
   *
   * @return True on equality.
   */
  bool operator==(const Bumpers&) const = default;
};

/**
 * The user configuration of the project.
 */
struct Config {
  /// The position of the front left swerve module.
  XYExpression frontLeft;

  /// The position of the back left swerve module.
  XYExpression backLeft;

  /// The mass of the robot. (kg)
  Expression mass;

  /// The inertia of the robot. (kg-m²)
  Expression inertia;

  /// The gearing of the robot.
  Expression gearing;

  /// The radius of the wheel. (m)
  Expression wheelRadius;

  /// The maximum velocity of the robot. (m/s)
  Expression vmax;

  /// The maximum torque of the robot. (N-m)
  Expression tmax;

  /// The bumpers of the robot.
  Bumpers bumpers;

  /// The width between the wheels of the robot. (m)
  Expression differentialTrackWidth;

  /**
   * Config equality operator.
   *
   * @return True on equality.
   */
  bool operator==(const Config&) const = default;
};

/**
 * A representation of a project file aka a .chor.
 */
struct ProjectFile {
  /// The name of the project.
  std::string name;

  /// The version of the project.
  std::string version;

  /// The sample type for the project.
  std::string type;

  /// A map of expressions in the project.
  std::unordered_map<std::string, Variable> expressions;

  /// A map of poses in the project.
  std::unordered_map<std::string, Pose> poses;

  /// The configuration of the project.
  Config config;

  /// The generation features of the project.
  std::vector<std::string> generationFeatures;

  /**
   * ProjectFile equality operator.
   *
   * @return True on equality.
   */
  bool operator==(const ProjectFile&) const = default;
};

void to_json(wpi::json& json, const Expression& exp);
void from_json(const wpi::json& json, Expression& exp);

void to_json(wpi::json& json, const XYExpression& xyexp);
void from_json(const wpi::json& json, XYExpression& xyexp);

void to_json(wpi::json& json, const Pose& pose);
void from_json(const wpi::json& json, Pose& pose);

void to_json(wpi::json& json, const Bumpers& bumpers);
void from_json(const wpi::json& json, Bumpers& bumpers);

void to_json(wpi::json& json, const Variable& var);
void from_json(const wpi::json& json, Variable& var);

void to_json(wpi::json& json, const Config& config);
void from_json(const wpi::json& json, Config& config);

void to_json(wpi::json& json, const ProjectFile& projectFile);
void from_json(const wpi::json& json, ProjectFile& projectFile);

}  // namespace choreo
