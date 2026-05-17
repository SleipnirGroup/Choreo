#pragma once
#include <variant>
#include <optional>
#include <wpi/util/json.hpp>
// ConstraintData components (each lives in its own header)
#include "constraint_data/constraint_data.hpp"
#include "constraint_scope.hpp"
// Waypoint ID types and helpers
namespace choreo {
struct WaypointIDX { uint64_t idx; };
struct FirstWaypoint {};
struct LastWaypoint {};
using WaypointID = std::variant<WaypointIDX, FirstWaypoint, LastWaypoint>;

inline std::optional<uint64_t> getWaypointIndex(const WaypointID& id, uint64_t totalWaypoints) {
  return std::visit([totalWaypoints](auto&& arg) -> std::optional<uint64_t> {
    using T = std::decay_t<decltype(arg)>;
    if constexpr (std::is_same_v<T, WaypointIDX>) {
      if (arg.idx >= totalWaypoints) return std::nullopt;
      return arg.idx;
    } else if constexpr (std::is_same_v<T, FirstWaypoint>) {
      return 0;
    } else { // LastWaypoint
      if (totalWaypoints == 0) return std::nullopt;
      return totalWaypoints - 1;
    }
  }, id);
}

inline void to_json(wpi::util::json& json, const WaypointID& id) {
  std::visit([&json](auto&& arg) {
    using T = std::decay_t<decltype(arg)>;
    if constexpr (std::is_same_v<T, WaypointIDX>) {
      json = wpi::util::json::object("idx", arg.idx);
    } else if constexpr (std::is_same_v<T, FirstWaypoint>) {
      json = "first";
    } else {
      json = "last";
    }
  }, id);
}
inline void from_json(const wpi::util::json& json, WaypointID& id) {
  if (json.contains("idx")) {
    int64_t index = json.at("idx").get_int();
    if (index < 0) throw std::invalid_argument("WaypointIDX index cannot be negative");
    id = WaypointIDX{.idx = static_cast<uint64_t>(index)};
  } else if (json.is_string() && json.get_string() == "first") {
    id = FirstWaypoint{};
  } else if (json.is_string() && json.get_string() == "last") {
    id = LastWaypoint{};
  } else {
    throw std::invalid_argument("Invalid WaypointID JSON");
  }
}



} // namespace choreo}  // namespace choreo