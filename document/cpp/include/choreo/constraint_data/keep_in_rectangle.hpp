// Copyright (c) Choreo contributors

#pragma once
#include "constraint_includes.hpp"
#include "../geometry/region2e.hpp"

namespace choreo::ConstraintData {
struct KeepInRectangle : public Region2e{
  static KeepInRectangle fromJson(const wpi::util::json& json);
  static std::string_view type_string() { return "KeepInRectangle"; }
  trajopt::Constraint toTrajoptConstraint(
      const std::vector<trajopt::KeepOutRegion>& bumpers) const {
    return trajopt::KeepInRectangleConstraint{
        bumpers, {x, y}, w / 2.0, h / 2.0};
  }
  static choreo::ConstraintScope scope() { return choreo::ConstraintScope::Both; }
  KeepInRectangle forEndpoints(const choreo::Waypoint& start,
                             const choreo::Waypoint& end) const {
    // For a keep-in-rectangle constraint, the endpoints don't affect the constraint
    // itself, so we can just return *this. However, we need to return a new
    // instance to satisfy the interface.
    return *this;
  }
};
inline void to_json(wpi::util::json& json, const KeepInRectangle& c) {
  to_json(json, static_cast<const Region2e&>(c));
  json["type"] = c.type_string();
}
inline void from_json(const wpi::util::json& json, KeepInRectangle& c) {
  from_json(json, static_cast<Region2e&>(c));
}

inline KeepInRectangle KeepInRectangle::fromJson(const wpi::util::json& json) {
  KeepInRectangle value;
  from_json(json, value);
  return value;
}

}  // namespace choreo::ConstraintData
