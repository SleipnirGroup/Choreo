// Copyright (c) Choreo contributors

#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include <wpi/json_fwd.h>

inline bool almost_equal(double a, double b, double epsilon = 1e-6) {
  return std::abs(a - b) < epsilon;
}

namespace choreo {
/** A representation of an expression. An equation and its value. */
class Expression {
 public:
  Expression() = default;
  Expression(std::string_view expression, double val)
      : expression{expression}, val{val} {}
  /** The equation. */
  std::string expression;
  /** The value. */
  double val{0.0};
  bool operator==(const Expression& other) const {
    return expression == other.expression && almost_equal(val, other.val);
  }
};

/** An xy pair of expressions. */
class XYExpression {
 public:
  XYExpression() = default;
  XYExpression(const Expression& x, const Expression& y) : x{x}, y{y} {}
  /** The x expression. */
  Expression x;
  /** The y expression. */
  Expression y;
  bool operator==(const XYExpression& other) const {
    return x == other.x && y == other.y;
  }
};

struct Pose {
  Pose() = default;
  Pose(const Expression& x, const Expression& y, const Expression& heading)
      : x{x}, y{y}, heading{heading} {}
  Expression x;
  Expression y;
  Expression heading;
  bool operator==(const Pose& other) const {
    return x == other.x && y == other.y && heading == other.heading;
  }
};

struct Variable {
  Variable() = default;
  Variable(std::string_view dimension, const Expression& var)
      : dimension{dimension}, var{var} {}
  std::string dimension;
  Expression var;
  bool operator==(const Variable& other) const {
    return dimension == other.dimension && var == other.var;
  }
};

/**
 * A collection of expressions representing the distance of the bumpers from the
 * center of the robot.
 */
class Bumpers {
 public:
  Bumpers() = default;
  Bumpers(const Expression& front, const Expression& back,
          const Expression& side)
      : front{front}, back{back}, side{side} {}
  /** The front bumper expression. */
  Expression front;
  /** The back bumper expression. */
  Expression back;
  /** The side bumper expression. */
  Expression side;
  bool operator==(const Bumpers& other) const {
    return front == other.front && back == other.back && side == other.side;
  }
};

/** The user configuration of the project. */
class Config {
 public:
  Config() = default;
  Config(const XYExpression& frontLeft, const XYExpression& backLeft,
         const Expression& mass, const Expression& inertia,
         const Expression& gearing, const Expression& wheelRadius,
         const Expression& vmax, const Expression& tmax, const Bumpers& bumpers,
         const Expression& differentialTrackWidth)
      : frontLeft{frontLeft},
        backLeft{backLeft},
        mass{mass},
        inertia{inertia},
        gearing{gearing},
        wheelRadius{wheelRadius},
        vmax{vmax},
        tmax{tmax},
        bumpers{bumpers},
        differentialTrackWidth{differentialTrackWidth} {}
  /** The position of the front left swerve module */
  XYExpression frontLeft;
  /** The position of the back left swerve module */
  XYExpression backLeft;
  /** The mass of the robot. (kg) */
  Expression mass;
  /** The inertia of the robot. (kg m^2) */
  Expression inertia;
  /** The gearing of the robot. */
  Expression gearing;
  /** The radius of the wheel. (m) */
  Expression wheelRadius;
  /** The maximum velocity of the robot. (m/s) */
  Expression vmax;
  /** The maximum torque of the robot. (N m) */
  Expression tmax;
  /** The bumpers of the robot. */
  Bumpers bumpers;
  /** The width between the wheels of the robot. (m) */
  Expression differentialTrackWidth;
  bool operator==(const Config& other) const {
    return frontLeft == other.frontLeft && backLeft == other.backLeft &&
           mass == other.mass && inertia == other.inertia &&
           gearing == other.gearing && wheelRadius == other.wheelRadius &&
           vmax == other.vmax && tmax == other.tmax &&
           bumpers == other.bumpers &&
           differentialTrackWidth == other.differentialTrackWidth;
  }
};

/** A representation of a project file aka a .chor. */
class ProjectFile {
 public:
  ProjectFile() = default;
  ProjectFile(std::string_view name, std::string_view version,
              std::string_view type,
              const std::unordered_map<std::string, Variable>& expressions,
              const std::unordered_map<std::string, Pose>& poses,
              const Config& config,
              const std::vector<std::string>& generationFeatures)
      : name{name},
        version{version},
        type{type},
        expressions{expressions},
        poses{poses},
        config{config},
        generationFeatures{generationFeatures} {}
  /** The name of the project. */
  std::string name;
  /** The version of the project. */
  std::string version;
  /** The sample type for the project */
  std::string type;
  /** A map of expressions in the project. */
  std::unordered_map<std::string, Variable> expressions;
  /** A map of poses in the project. */
  std::unordered_map<std::string, Pose> poses;
  /** The configuration of the project. */
  Config config;
  /** The generation features of the project. */
  std::vector<std::string> generationFeatures;
  bool operator==(const ProjectFile& other) const {
    return name == other.name && version == other.version &&
           type == other.type && expressions == other.expressions &&
           poses == other.poses && config == other.config &&
           generationFeatures == other.generationFeatures;
  }
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
