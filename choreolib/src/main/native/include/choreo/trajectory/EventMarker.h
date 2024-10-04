// Copyright (c) Choreo contributors

#pragma once

#include <string>

#include <units/time.h>
#include <wpi/json_fwd.h>

namespace choreo {

/**
 * A marker for an event in a trajectory.
 */
struct EventMarker {
  /// The timestamp of the event.
  units::second_t timestamp;

  /// The event.
  std::string event;

  /**
   * Returns a new EventMarker with the timestamp offset by the specified
   * amount.
   *
   * @param timestampOffset The amount to offset the timestamp by.
   * @return A new EventMarker with the timestamp offset by the specified
   * amount.
   */
  EventMarker OffsetBy(units::second_t timestampOffset) {
    return EventMarker{timestamp + timestampOffset, event};
  }

  bool operator==(const EventMarker&) const = default;
};

void to_json(wpi::json& json, const EventMarker& event);
void from_json(const wpi::json& json, EventMarker& event);

}  // namespace choreo
