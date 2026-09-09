// Copyright (c) Choreo contributors

#include "choreo/trajectory/EventMarker.hpp"

#include <string>

#include <wpi/json.h>

void choreo::to_json(wpi::json& json, const EventMarker& event) {
  json = wpi::json{{"data", wpi::json{{"t", event.timestamp.value()}}},
                   {"event", wpi::json{{"name", event.event}}}};
}

void choreo::from_json(const wpi::json& json, EventMarker& event) {
  auto targetTimestamp = json.at("from").at("targetTimestamp");
  if (!targetTimestamp.is_number()) {
    event.timestamp = units::second_t{-1};
    event.event = "";
  } else {
    event.timestamp =
        units::second_t{json.at("from").at("offset").at("val").get<double>() +
                        targetTimestamp.get<double>()};
    event.event = json.at("name").get<std::string>();
  }
}
