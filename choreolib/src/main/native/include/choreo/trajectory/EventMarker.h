// Copyright (c) Choreo contributors

#pragma once

#include <string>

#include <units/time.h>
#include <wpi/json_fwd.h>

namespace choreo {
namespace trajectory {
struct EventMarker {
  units::second_t timestamp;
  std::string event;

  EventMarker OffsetBy(units::second_t timestampOffset) {
    return EventMarker{timestamp + timestampOffset, event};
  }
};

void to_json(wpi::json& json, const EventMarker& event);
void from_json(const wpi::json& json, EventMarker& event);
}  // namespace trajectory
}  // namespace choreo
