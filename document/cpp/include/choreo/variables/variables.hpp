// Copyright (c) Choreo contributors

#pragma once

#include <map>
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
  static Variables fromJson(const wpi::util::json& json);
  wpi::util::StringMap<VariableVariant> expressions;
  wpi::util::StringMap<Translation2e> translations;
  wpi::util::StringMap<Pose2e> poses;
  wpi::util::StringMap<Region2e> regions;
};

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
      vars.expressions.emplace(std::string(kv.first),
                               kv.second.get<VariableVariant>());
    }
  }

  if (json.contains("translations")) {
    auto obj = json.at("translations").get_object();
    for (auto& kv : obj) {
      vars.translations.emplace(std::string(kv.first),
                                kv.second.get<Translation2e>());
    }
  }

  if (json.contains("poses")) {
    auto obj = json.at("poses").get_object();
    for (auto& kv : obj) {
      vars.poses.emplace(std::string(kv.first), kv.second.get<Pose2e>());
    }
  }

  if (json.contains("regions")) {
    auto obj = json.at("regions").get_object();
    for (auto& kv : obj) {
      vars.regions.emplace(std::string(kv.first), kv.second.get<Region2e>());
    }
  }
}

inline Variables Variables::fromJson(const wpi::util::json& json) {
  Variables value;
  from_json(json, value);
  return value;
}

}  // namespace choreo
