// Copyright (c) Choreo contributors

#pragma once

#include <string>

#include <wpi/units/time.hpp>
#include <wpi/util/json.hpp>

namespace choreo {

/// A marker for an event in a trajectory.
struct EventMarker {
  /// The timestamp of the event.
  wpi::units::second_t timestamp;

  /// The event.
  std::string event;

  /// Returns a new EventMarker with the timestamp offset by the specified
  /// amount.
  ///
  /// @param timestampOffset The amount to offset the timestamp by.
  /// @return A new EventMarker with the timestamp offset by the specified
  ///     amount.
  EventMarker OffsetBy(wpi::units::second_t timestampOffset) const {
    return EventMarker{timestamp + timestampOffset, event};
  }

  /// EventMarker equality operator.
  ///
  /// @return True for equality.
  bool operator==(const EventMarker&) const = default;
};

void to_json(wpi::util::json& json, const EventMarker& event);
void from_json(const wpi::util::json& json, EventMarker& event);

}  // namespace choreo
