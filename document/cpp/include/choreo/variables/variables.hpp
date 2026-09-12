// Copyright (c) Choreo contributors

#pragma once

#include <string>

#include <wpi/util/json.hpp>

#include "../geometry/pose2e.hpp"
#include "../geometry/region2e.hpp"
#include "../geometry/translation2e.hpp"
#include "variable.hpp"

namespace wpi::util {

template <typename T>
inline void to_json(json& json, const StringMap<T>& map) {
  json.set_object();
  for (auto const& kv : map) {
    json[kv.first] = kv.second;
  }
}

template <typename T>
inline void from_json(const json& json, StringMap<T>& map) {
  map.clear();
  for (auto const& kv : json.get_object()) {
    map.emplace(kv.first, kv.second.get<T>());
  }
}

}  // namespace wpi::util

namespace choreo {

struct Variables {
  Variables() = default;
  Variables(const Variables&) = default;
  static Variables fromJson(const wpi::util::json& json);
  struct ExpressionVariable {
    ExpressionVariable() = default;
    ExpressionVariable(const ExpressionVariable&) = default;
    std::string name;
    VariableVariant value;
  };

  struct TranslationVariable {
    TranslationVariable() = default;
    TranslationVariable(const TranslationVariable&) = default;
    std::string name;
    Translation2e value;
  };

  struct PoseVariable {
    PoseVariable() = default;
    PoseVariable(const PoseVariable&) = default;
    std::string name;
    Pose2e value;
  };

  struct RegionVariable {
    RegionVariable() = default;
    RegionVariable(const RegionVariable&) = default;
    std::string name;
    Region2e value;
  };

  wpi::util::StringMap<ExpressionVariable> expressions;
  wpi::util::StringMap<TranslationVariable> translations;
  wpi::util::StringMap<PoseVariable> poses;
  wpi::util::StringMap<RegionVariable> regions;
};

inline void to_json(wpi::util::json& json,
                    const Variables::ExpressionVariable& variable) {
  json = wpi::util::json(variable.value);
  json["name"] = variable.name;
}

inline void from_json(const wpi::util::json& json,
                      Variables::ExpressionVariable& variable) {
  variable.name = json.at("name").get_string();
  variable.value = json.get<VariableVariant>();
}

inline void to_json(wpi::util::json& json,
                    const Variables::TranslationVariable& variable) {
  json = wpi::util::json::object("name", variable.name, "value",
                                 variable.value);
}

inline void from_json(const wpi::util::json& json,
                      Variables::TranslationVariable& variable) {
  variable.name = json.at("name").get_string();
  variable.value = json.at("value").get<Translation2e>();
}

inline void to_json(wpi::util::json& json,
                    const Variables::PoseVariable& variable) {
  json = wpi::util::json::object("name", variable.name, "value",
                                 variable.value);
}

inline void from_json(const wpi::util::json& json,
                      Variables::PoseVariable& variable) {
  variable.name = json.at("name").get_string();
  variable.value = json.at("value").get<Pose2e>();
}

inline void to_json(wpi::util::json& json,
                    const Variables::RegionVariable& variable) {
  json = wpi::util::json::object("name", variable.name, "value",
                                 variable.value);
}

inline void from_json(const wpi::util::json& json,
                      Variables::RegionVariable& variable) {
  variable.name = json.at("name").get_string();
  variable.value = json.at("value").get<Region2e>();
}

inline wpi::util::json VariableEntryJsonWithUuid(
    std::string_view uuid, const Variables::ExpressionVariable& variable) {
  auto json = wpi::util::json(variable);
  json["uuid"] = std::string(uuid);
  return json;
}

inline wpi::util::json VariableEntryJsonWithUuid(
    std::string_view uuid, const Variables::TranslationVariable& variable) {
  auto json = wpi::util::json(variable);
  json["uuid"] = std::string(uuid);
  return json;
}

inline wpi::util::json VariableEntryJsonWithUuid(
    std::string_view uuid, const Variables::PoseVariable& variable) {
  auto json = wpi::util::json(variable);
  json["uuid"] = std::string(uuid);
  return json;
}

inline wpi::util::json VariableEntryJsonWithUuid(
    std::string_view uuid, const Variables::RegionVariable& variable) {
  auto json = wpi::util::json(variable);
  json["uuid"] = std::string(uuid);
  return json;
}

inline void to_json(wpi::util::json& json, const Variables& vars) {
  json = wpi::util::json::object("expressions", vars.expressions,
                                 "translations", vars.translations, "poses",
                                 vars.poses, "regions", vars.regions);
}

inline void from_json(const wpi::util::json& json, Variables& vars) {
  vars.expressions.clear();
  vars.translations.clear();
  vars.poses.clear();
  vars.regions.clear();

  if (json.contains("expressions")) {
    auto obj = json.at("expressions").get_object();
    for (auto& kv : obj) {
      auto variable = kv.second.get<Variables::ExpressionVariable>();
      vars.expressions.emplace(std::string(kv.first), std::move(variable));
    }
  }

  if (json.contains("translations")) {
    auto obj = json.at("translations").get_object();
    for (auto& kv : obj) {
      auto variable = kv.second.get<Variables::TranslationVariable>();
      vars.translations.emplace(std::string(kv.first), std::move(variable));
    }
  }

  if (json.contains("poses")) {
    auto obj = json.at("poses").get_object();
    for (auto& kv : obj) {
      auto variable = kv.second.get<Variables::PoseVariable>();
      vars.poses.emplace(std::string(kv.first), std::move(variable));
    }
  }

  if (json.contains("regions")) {
    auto obj = json.at("regions").get_object();
    for (auto& kv : obj) {
      auto variable = kv.second.get<Variables::RegionVariable>();
      vars.regions.emplace(std::string(kv.first), std::move(variable));
    }
  }
}

inline Variables Variables::fromJson(const wpi::util::json& json) {
  Variables value;
  from_json(json, value);
  return value;
}

}  // namespace choreo
