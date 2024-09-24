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
class Expression {
 public:
  Expression() = default;
  Expression(const std::string& exp, double val) : std::exp(exp), val(val) {}
  std::string exp;
  double val;
  bool operator==(const Expression& other) const {
    return exp == other.exp && almost_equal(val, other.val);
  }
};

class XYExpression {
 public:
  XYExpression() = default;
  XYExpression(const Expression& x, const Expression& y) : x(x), y(y) {}
  Expression x;
  Expression y;
  bool operator==(const XYExpression& other) const {
    return x == other.x && y == other.y;
  }
};

struct Pose {
  Pose() = default;
  Pose(const Expression& x, const Expression& y, const Expression& heading)
      : x(x), y(y), heading(heading) {}
  Expression x;
  Expression y;
  Expression heading;
  bool operator==(const Pose& other) const {
    return x == other.x && y == other.y && heading == other.heading;
  }
};

struct Variable {
  Variable() = default;
  Variable(const std::string& dimension, const Expression& var)
      : dimension(dimension), var(var) {}
  std::string dimension;
  Expression var;
  bool operator==(const Variable& other) const {
    return dimension == other.dimension && var == other.var;
  }
};

class Bumpers {
 public:
  Bumpers() = default;
  Bumpers(const Expression& front, const Expression& back,
          const Expression& left, const Expression& right)
      : front(front), back(back), left(left), right(right) {}
  Expression front;
  Expression back;
  Expression left;
  Expression right;
  bool operator==(const Bumpers& other) const {
    return front == other.front && back == other.back && left == other.left &&
           right == other.right;
  }
};

class Config {
 public:
  Config() = default;
  Config(const std::vector<XYExpression>& modules, const Expression& mass,
         const Expression& inertia, const Expression& gearing,
         const Expression& wheelRadius, const Expression& vmax,
         const Expression& tmax, const Bumpers& bumpers,
         const Expression& diffTrackWidth)
      : modules(modules),
        mass(mass),
        inertia(inertia),
        gearing(gearing),
        wheelRadius(wheelRadius),
        vmax(vmax),
        tmax(tmax),
        bumpers(bumpers),
        diffTrackWidth(diffTrackWidth) {}
  std::vector<XYExpression> modules;
  Expression mass;
  Expression inertia;
  Expression gearing;
  Expression wheelRadius;
  Expression vmax;
  Expression tmax;
  Bumpers bumpers;
  Expression diffTrackWidth;
  bool operator==(const Config& other) const {
    return modules == other.modules && mass == other.mass &&
           inertia == other.inertia && gearing == other.gearing &&
           wheelRadius == other.wheelRadius && vmax == other.vmax &&
           tmax == other.tmax && bumpers == other.bumpers &&
           diffTrackWidth == other.diffTrackWidth;
  }
};

class ProjectFile {
 public:
  ProjectFile() = default;
  ProjectFile(const std::string& name, const std::string& version,
              const std::string& type,
              const std::unordered_map<std::string, Variable>& expressions,
              const std::unordered_map<std::string, Pose>& poses,
              const Config& config,
              const std::vector<std::string>& generationFeatures)
      : name(name),
        version(version),
        type(type),
        expressions(expressions),
        poses(poses),
        config(config),
        generationFeatures(generationFeatures) {}
  std::string name;
  std::string version;
  std::string type;
  std::unordered_map<std::string, Variable> expressions;
  std::unordered_map<std::string, Pose> poses;
  Config config;
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
