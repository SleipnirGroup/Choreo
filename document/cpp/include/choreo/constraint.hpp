// Copyright (c) Choreo contributors

#pragma once
#include <optional>
#include <string>
#include <variant>
#include <vector>

#include <wpi/util/json.hpp>
// ConstraintData components (each lives in its own header)
#include "constraint_data/constraint_data.hpp"
#include "constraint_data/constraint_scope.hpp"
#include "waypoint.hpp"

// Waypoint ID types and helpers
namespace choreo {
struct WaypointUUID {
  WaypointUUID() = default;
  WaypointUUID(const WaypointUUID&) = default;
  std::string uuid;

  bool equivalent(const WaypointUUID& other) const { return uuid == other.uuid; }
};
struct FirstWaypoint {
  FirstWaypoint() = default;
  FirstWaypoint(const FirstWaypoint&) = default;
  bool equivalent(const FirstWaypoint& other) const { return true; }
};
struct LastWaypoint {
  LastWaypoint() = default;
  LastWaypoint(const LastWaypoint&) = default;
  bool equivalent(const LastWaypoint& other) const { return true; }
};
using WaypointID = std::variant<WaypointUUID, FirstWaypoint, LastWaypoint>;

inline bool equivalent(const WaypointID& lhs, const WaypointID& rhs) {
  return std::visit(
      [](const auto& left, const auto& right) {
        using L = std::decay_t<decltype(left)>;
        using R = std::decay_t<decltype(right)>;
        if constexpr (std::is_same_v<L, R>) {
          return left.equivalent(right);
        }
        return false;
      },
      lhs, rhs);
}

inline bool equivalent(const ConstraintData::ConstraintVariant& lhs,
                       const ConstraintData::ConstraintVariant& rhs) {
  return std::visit(
      [](const auto& left, const auto& right) {
        using L = std::decay_t<decltype(left)>;
        using R = std::decay_t<decltype(right)>;
        if constexpr (std::is_same_v<L, R>) {
          return left.equivalent(right);
        }
        return false;
      },
      lhs, rhs);
}

inline std::optional<size_t> getWaypointIndex(
    const WaypointID& id, const std::vector<Waypoint>& waypoints) {
  return std::visit(
      [&waypoints](auto&& arg) -> std::optional<size_t> {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, WaypointUUID>) {
          auto iter = std::find_if(
              waypoints.begin(), waypoints.end(),
              [&](const Waypoint& waypoint) { return waypoint.uuid == arg.uuid; });
          if (iter == waypoints.end()) {
            return std::nullopt;
          }
          return static_cast<size_t>(std::distance(waypoints.begin(), iter));
        } else if constexpr (std::is_same_v<T, FirstWaypoint>) {
          if (waypoints.empty())
            return std::nullopt;
          return 0;
        } else {  // LastWaypoint
          if (waypoints.empty())
            return std::nullopt;
          return waypoints.size() - 1;
        }
      },
      id);
}

inline void to_json(wpi::util::json& json, const WaypointID& id) {
  std::visit(
      [&json](auto&& arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, WaypointUUID>) {
          json = wpi::util::json::object("uuid", arg.uuid);
        } else if constexpr (std::is_same_v<T, FirstWaypoint>) {
          json = "first";
        } else {
          json = "last";
        }
      },
      id);
}
inline void from_json(const wpi::util::json& json, WaypointID& id) {
  if (json.contains("uuid")) {
    WaypointUUID waypointUuid;
    waypointUuid.uuid = json.at("uuid").get_string();
    id = waypointUuid;
  } else if (json.is_string() && json.get_string() == "first") {
    id = FirstWaypoint{};
  } else if (json.is_string() && json.get_string() == "last") {
    id = LastWaypoint{};
  } else {
    throw std::invalid_argument("Invalid WaypointID JSON");
  }
}

struct ConstraintIDX {
  ConstraintIDX() = default;
  ConstraintIDX(const ConstraintIDX&) = default;
  size_t from;
  std::optional<size_t> to;  // if not specified, applies only to
  ConstraintData::ConstraintVariant data;

  bool equivalent(const ConstraintIDX& other) const {
    return from == other.from && to == other.to &&
           choreo::equivalent(data, other.data);
  }
};

struct Constraint {
  Constraint() = default;
  Constraint(const Constraint&) = default;
  static Constraint fromJson(const wpi::util::json& json);
  std::string uuid;
  WaypointID from;
  std::optional<WaypointID>
      to;  // if not specified, applies only to the "from" waypoint
  ConstraintData::ConstraintVariant data;
  bool enabled;

  bool equivalent(const Constraint& other) const {
    if (!enabled && !other.enabled) {
      return true; // Both constraints are disabled, so they are equivalently irrelevant.
    }
    if (!choreo::equivalent(from, other.from) || enabled != other.enabled ||
        !choreo::equivalent(data, other.data)) {
      return false;
    }
    if (to.has_value() != other.to.has_value()) {
      return false;
    }
    if (!to.has_value()) {
      return true;
    }
    return choreo::equivalent(*to, *other.to);
  }

  std::optional<ConstraintIDX> toConstraintIDX(
      const std::vector<Waypoint>& waypoints) const {
    auto fromIdxOpt = getWaypointIndex(from, waypoints);
    if (!fromIdxOpt) {
      return std::nullopt;
    }
    size_t fromIdx = *fromIdxOpt;

    std::optional<size_t> toIdxOpt;
    if (to) {
      toIdxOpt = getWaypointIndex(*to, waypoints);
      if (!toIdxOpt)
        return std::nullopt;
    }

    ConstraintIDX idx;
    idx.from = fromIdx;
    idx.to = toIdxOpt;
    idx.data = data;
    return idx;
  }
};
inline void to_json(wpi::util::json& json, const Constraint& constraint) {
  json = wpi::util::json::object("uuid", constraint.uuid, "from",
                                 constraint.from, "data", constraint.data,
                                 "enabled", constraint.enabled);
  if (constraint.to) {
    json["to"] = *constraint.to;
  }
}
inline void from_json(const wpi::util::json& json, Constraint& constraint) {
  constraint.uuid = json.at("uuid").get_string();
  constraint.from = json.at("from").get<WaypointID>();
  if (json.contains("to"))
    constraint.to = json.at("to").get<WaypointID>();
  constraint.data = json.at("data").get<ConstraintData::ConstraintVariant>();
  constraint.enabled = json.at("enabled").get_bool();
}

inline Constraint Constraint::fromJson(const wpi::util::json& json) {
  Constraint value;
  from_json(json, value);
  return value;
}

}  // namespace choreo
