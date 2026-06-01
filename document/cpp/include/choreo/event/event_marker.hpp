#pragma once

#include <optional>
#include <string>
#include <variant>
#include <vector>

#include "choreo/expr.hpp"
#include "choreo/variables/dimension.hpp"
#include <wpi/util/json.hpp>
namespace choreo {

struct EventMarkerData {
    std::optional<std::size_t> target;
    std::optional<dimensions::Time::baseUnit> targetTimestamp;
    Expr<dimensions::Time> offset;
};

inline void to_json(wpi::util::json& json, const EventMarkerData& data) {
    const wpi::util::json target_json = data.target ?
        wpi::util::json(*data.target) : wpi::util::json();
    const wpi::util::json target_timestamp_json = data.targetTimestamp ?
        wpi::util::json(data.targetTimestamp->value()) : wpi::util::json();
    json = wpi::util::json::object(
        "target", target_json,
        "targetTimestamp", target_timestamp_json,
        "offset", data.offset
    );
}

inline void from_json(const wpi::util::json& json, EventMarkerData& data) {
    if (json.contains("target") && !json.at("target").empty()) {
        data.target = static_cast<std::size_t>(json.at("target").get_number());
    } else {
        data.target = std::nullopt;
    }
    if (json.contains("targetTimestamp") && !json.at("targetTimestamp").empty()) {
        data.targetTimestamp = static_cast<dimensions::Time::baseUnit>(json.at("targetTimestamp").get_number());
    } else {
        data.targetTimestamp = std::nullopt;
    }
    data.offset = json.at("offset").get<Expr<dimensions::Time>>();
}

struct EventMarker {
    std::string name;
    EventMarkerData from;
};

inline void to_json(wpi::util::json& json, const EventMarker& marker) {
    json = wpi::util::json::object(
        "name", marker.name,
        "from", marker.from
    );
}  
inline void from_json(const wpi::util::json& json, EventMarker& marker) {
    marker.name = json.at("name").get_string();
    marker.from = json.at("from").get<EventMarkerData>();
}

} // namespace choreo::event
