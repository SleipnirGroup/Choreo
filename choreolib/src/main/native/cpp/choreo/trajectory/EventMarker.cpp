// Copyright (c) Choreo contributors

#include "choreo/trajectory/EventMarker.hpp"

#include <string>

#include "wpi/util/json.hpp"

void choreo::to_json(wpi::util::json& json, const EventMarker& event) {
  json = wpi::util::json{{"data", wpi::util::json{{"t", event.timestamp.value()}}},
                   {"event", wpi::util::json{{"name", event.event}}}};
}

void choreo::from_json(const wpi::util::json& json, EventMarker& event) {
  auto targetTimestamp = json.at("from").at("targetTimestamp");
  if (!targetTimestamp.is_number()) {
    event.timestamp = units::second_t{-1};
    event.event = "";
  } else {
    event.timestamp =
        units::second_t{json.at("from").at("offset").at("val").get_number() +
                        targetTimestamp.get_number()};
    event.event = json.at("name").get_string();
  }
}
