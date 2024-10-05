// Copyright (c) Choreo contributors

#include "choreo/trajectory/EventMarker.h"

#include <string>

#include <wpi/json.h>

using namespace choreo;

void choreo::to_json(wpi::json& json, const EventMarker& event) {
  json = wpi::json{{"data", wpi::json{{"t", event.timestamp.value()}}},
                   {"event", wpi::json{{"name", event.event}}}};
}

void choreo::from_json(const wpi::json& json, EventMarker& event) {
  event.timestamp =
      units::second_t{json.at("data").at("timestamp").at("val").get<double>()};
  event.event = json.at("event").at("event").get<std::string>();
}
