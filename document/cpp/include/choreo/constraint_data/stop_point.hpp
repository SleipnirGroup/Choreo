// Copyright (c) Choreo contributors

#pragma once
#include <wpi/util/json.hpp>

namespace choreo::ConstraintData {
struct StopPoint {};
inline void to_json(wpi::util::json& json, const StopPoint&) {
  json = wpi::util::json::object("type", "StopPoint");
}
inline void from_json(const wpi::util::json&, StopPoint&) {
  // no data
}
}  // namespace choreo::ConstraintData
