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
      units::second_t{json.at("from").at("offset").at("val").get<double>() +
                      json.at("from").at("targetTimestamp").get<double>()};
  event.event = json.at("name").get<std::string>();
}
