// Copyright (c) Choreo contributors

#include "choreo/trajectory/EventMarker.h"

#include <wpi/json.h>

using namespace choreo;

void choreo::to_json(wpi::json& json, const EventMarker& event) {
  json = wpi::json{{"t", event.timestamp.value()}, {"name", event.event}};
}

void choreo::from_json(const wpi::json& json, EventMarker& event) {
  event.timestamp = units::second_t{json.at("t").get<double>()};
  event.event = event.event;
}
