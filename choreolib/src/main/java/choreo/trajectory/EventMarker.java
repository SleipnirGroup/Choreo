// Copyright (c) Choreo contributors

package choreo.trajectory;

/** A marker for an event in a trajectory. */
public record EventMarker(double timestamp, String event) {
  /**
   * Returns a new EventMarker with the timestamp offset by the specified amount.
   *
   * @param timestampOffset The amount to offset the timestamp by.
   * @return A new EventMarker with the timestamp offset by the specified amount.
   */
  public EventMarker offsetBy(double timestampOffset) {
    return new EventMarker(timestamp + timestampOffset, event);
  }
}
