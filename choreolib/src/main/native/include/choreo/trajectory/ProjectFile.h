// Copyright (c) Choreo contributors

#pragma once

#include <string>
#include <string_view>
#include <unordered_map>
#include <utility>
#include <vector>

#include <wpi/json_fwd.h>

namespace choreo {

/**
 * A representation of an expression. An equation and its value.
 */
class Expression {
 public:
  Expression() = default;

  Expression(std::string_view expression, double val)
      : expression{expression}, val{val} {}

  /// The equation.
  std::string expression;

  /// The value.
  double val = 0.0;

  bool operator==(const Expression& other) const {
    return expression == other.expression && std::abs(val - other.val) < 1e-6;
  }
};

/**
 * An x-y pair of expressions.
 */
class XYExpression {
 public:
  XYExpression() = default;

  XYExpression(Expression x, Expression y) : x{std::move(x)}, y{std::move(y)} {}

  /** The x expression. */
  Expression x;

  /** The y expression. */
  Expression y;

  bool operator==(const XYExpression&) const = default;
};

struct Pose {
  Pose() = default;

  Pose(Expression x, Expression y, Expression heading)
      : x{std::move(x)}, y{std::move(y)}, heading{std::move(heading)} {}

  Expression x;
  Expression y;
  Expression heading;

  bool operator==(const Pose&) const = default;
};

struct Variable {
  Variable() = default;

  Variable(std::string_view dimension, Expression var)
      : dimension{dimension}, var{std::move(var)} {}

  std::string dimension;

  Expression var;

  bool operator==(const Variable&) const = default;
};

/**
 * A collection of expressions representing the distance of the bumpers from the
 * center of the robot.
 */
class Bumpers {
 public:
  Bumpers() = default;

  Bumpers(Expression front, Expression back, Expression side)
      : front{std::move(front)}, back{std::move(back)}, side{std::move(side)} {}

  /** The front bumper expression. */
  Expression front;

  /** The back bumper expression. */
  Expression back;

  /** The side bumper expression. */
  Expression side;

  bool operator==(const Bumpers& other) const = default;
};

/** The user configuration of the project. */
class Config {
 public:
  Config() = default;

  Config(XYExpression frontLeft, XYExpression backLeft, Expression mass,
         Expression inertia, Expression gearing, Expression wheelRadius,
         Expression vmax, Expression tmax, Bumpers bumpers,
         Expression differentialTrackWidth)
      : frontLeft{std::move(frontLeft)},
        backLeft{std::move(backLeft)},
        mass{std::move(mass)},
        inertia{std::move(inertia)},
        gearing{std::move(gearing)},
        wheelRadius{std::move(wheelRadius)},
        vmax{std::move(vmax)},
        tmax{std::move(tmax)},
        bumpers{std::move(bumpers)},
        differentialTrackWidth{std::move(differentialTrackWidth)} {}

  /// The position of the front left swerve module.
  XYExpression frontLeft;

  /// The position of the back left swerve module.
  XYExpression backLeft;

  /// The mass of the robot. (kg)
  Expression mass;

  /// The inertia of the robot. (kg m^2)
  Expression inertia;

  /// The gearing of the robot.
  Expression gearing;

  /// The radius of the wheel. (m)
  Expression wheelRadius;

  /// The maximum velocity of the robot. (m/s)
  Expression vmax;

  /// The maximum torque of the robot. (N m)
  Expression tmax;

  /// The bumpers of the robot.
  Bumpers bumpers;

  /// The width between the wheels of the robot. (m)
  Expression differentialTrackWidth;

  bool operator==(const Config&) const = default;
};

/**
 * A representation of a project file aka a .chor.
 */
class ProjectFile {
 public:
  ProjectFile() = default;

  ProjectFile(std::string_view name, std::string_view version,
              std::string_view type,
              std::unordered_map<std::string, Variable> expressions,
              std::unordered_map<std::string, Pose> poses, Config config,
              std::vector<std::string> generationFeatures)
      : name{name},
        version{version},
        type{type},
        expressions{std::move(expressions)},
        poses{std::move(poses)},
        config{std::move(config)},
        generationFeatures{std::move(generationFeatures)} {}

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

  bool operator==(const ProjectFile& other) const = default;
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
