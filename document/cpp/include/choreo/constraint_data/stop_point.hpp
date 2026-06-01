// Copyright (c) Choreo contributors

#pragma once
#include <wpi/util/json.hpp>

namespace choreo::ConstraintData {
struct StopPoint {
  static StopPoint from(const wpi::util::json&) { return StopPoint(); }
  static StopPoint fromJson(const wpi::util::json& json);
};
inline void to_json(wpi::util::json& json, const StopPoint&) {
  json = wpi::util::json::object("type", "StopPoint");
}
inline void from_json(const wpi::util::json&, StopPoint&) {
  // no data
}
inline StopPoint StopPoint::fromJson(const wpi::util::json& json) {
  StopPoint value;
  from_json(json, value);
  return value;
}
}  // namespace choreo::ConstraintData
