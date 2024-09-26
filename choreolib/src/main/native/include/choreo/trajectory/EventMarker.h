// Copyright (c) Choreo contributors

#pragma once

#include <string>

#include <units/time.h>
#include <wpi/json_fwd.h>

namespace choreo {
struct EventMarker {
  units::second_t timestamp;
  std::string event;

  EventMarker OffsetBy(units::second_t timestampOffset) {
    return EventMarker{timestamp + timestampOffset, event};
  }

  bool operator==(const EventMarker& other) const {
    return (timestamp == other.timestamp) && (event == other.event);
  }

  bool operator!=(const EventMarker& other) const { return !(*this == other); }
};

void to_json(wpi::json& json, const EventMarker& event);
void from_json(const wpi::json& json, EventMarker& event);
}  // namespace choreo
