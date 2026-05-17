#pragma once
#include <string>
#include <wpi/util/json.hpp>

namespace choreo {
enum class ConstraintScope {
  Global,
  Waypoint,
  Segment
};

inline void to_json(wpi::util::json &json, ConstraintScope scope) {
  switch (scope) {
    case ConstraintScope::Global: json = "global"; break;
    case ConstraintScope::Waypoint: json = "waypoint"; break;
    case ConstraintScope::Segment: json = "segment"; break;
  }
}

inline void from_json(const wpi::util::json &json, ConstraintScope &scope) {
  if (!json.is_string()) throw std::invalid_argument("ConstraintScope must be a string");
  const auto s = json.get_string();
  if (s == "global") scope = ConstraintScope::Global;
  else if (s == "waypoint") scope = ConstraintScope::Waypoint;
  else if (s == "segment") scope = ConstraintScope::Segment;
  else throw std::invalid_argument("Unknown ConstraintScope: " + s);
}
} // namespace choreo