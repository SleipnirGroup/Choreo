// Copyright (c) Choreo contributors

#pragma once
#include <optional>
#include <variant>

#include <wpi/util/json.hpp>
// ConstraintData components (each lives in its own header)
#include "constraint_data/constraint_data.hpp"
#include "constraint_scope.hpp"

// Waypoint ID types and helpers
namespace choreo {
struct WaypointIDX {
  uint64_t idx;
};
struct FirstWaypoint {};
struct LastWaypoint {};
using WaypointID = std::variant<WaypointIDX, FirstWaypoint, LastWaypoint>;

inline std::optional<uint64_t> getWaypointIndex(const WaypointID& id,
                                                uint64_t totalWaypoints) {
  return std::visit(
      [totalWaypoints](auto&& arg) -> std::optional<uint64_t> {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, WaypointIDX>) {
          if (arg.idx >= totalWaypoints)
            return std::nullopt;
          return arg.idx;
        } else if constexpr (std::is_same_v<T, FirstWaypoint>) {
          return 0;
        } else {  // LastWaypoint
          if (totalWaypoints == 0)
            return std::nullopt;
          return totalWaypoints - 1;
        }
      },
      id);
}

inline void to_json(wpi::util::json& json, const WaypointID& id) {
  std::visit(
      [&json](auto&& arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, WaypointIDX>) {
          json = wpi::util::json::object("idx", arg.idx);
        } else if constexpr (std::is_same_v<T, FirstWaypoint>) {
          json = "first";
        } else {
          json = "last";
        }
      },
      id);
}
inline void from_json(const wpi::util::json& json, WaypointID& id) {
  if (json.contains("idx")) {
    int64_t index = json.at("idx").get_int();
    if (index < 0)
      throw std::invalid_argument("WaypointIDX index cannot be negative");
    id = WaypointIDX{.idx = static_cast<uint64_t>(index)};
  } else if (json.is_string() && json.get_string() == "first") {
    id = FirstWaypoint{};
  } else if (json.is_string() && json.get_string() == "last") {
    id = LastWaypoint{};
  } else {
    throw std::invalid_argument("Invalid WaypointID JSON");
  }
}

struct ConstraintIDX {
  uint64_t from;
  std::optional<uint64_t> to;  // if not specified, applies only to
  ConstraintData::ConstraintVariant data;
  bool enabled;
};

struct Constraint {
  WaypointID from;
  std::optional<WaypointID>
      to;  // if not specified, applies only to the "from" waypoint
  ConstraintData::ConstraintVariant data;
  bool enabled;

  std::optional<ConstraintIDX> toConstraintIDX(uint64_t totalWaypoints) const {
    auto fromIdxOpt = getWaypointIndex(from, totalWaypoints);
    if (!fromIdxOpt) {
      return std::nullopt;
    }
    uint64_t fromIdx = *fromIdxOpt;

    std::optional<uint64_t> toIdxOpt;
    if (to) {
      toIdxOpt = getWaypointIndex(*to, totalWaypoints);
      if (!toIdxOpt)
        return std::nullopt;
    }

    return ConstraintIDX{
        .from = fromIdx, .to = toIdxOpt, .data = data, .enabled = enabled};
  }
};
void to_json(wpi::util::json& json, const Constraint& constraint) {
  json =
      wpi::util::json::object("from", constraint.from, "data", constraint.data,
                              "enabled", constraint.enabled);
  if (constraint.to) {
    json["to"] = *constraint.to;
  }
}
void from_json(const wpi::util::json& json, Constraint& constraint) {
  constraint.from = json.at("from").get<WaypointID>();
  if (json.contains("to"))
    constraint.to = json.at("to").get<WaypointID>();
  constraint.data = json.at("data").get<ConstraintData::ConstraintVariant>();
  constraint.enabled = json.at("enabled").get_bool();
}

}  // namespace choreo
