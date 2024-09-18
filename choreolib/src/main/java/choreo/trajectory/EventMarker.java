// Copyright (c) Choreo contributors

package choreo.trajectory;

// /** A marker for an event in a trajectory. */
// public record EventMarker(double timestamp, String event) {
//   /**
//    * Returns a new EventMarker with the timestamp offset by the specified amount.
//    *
//    * @param timestampOffset The amount to offset the timestamp by.
//    * @return A new EventMarker with the timestamp offset by the specified amount.
//    */
//   public EventMarker offsetBy(double timestampOffset) {
//     return new EventMarker(timestamp + timestampOffset, event);
//   }
// }

/** A marker for an event in a trajectory. */
public class EventMarker {
  /** The timestamp of the event. */
  public final double timestamp;

  /** The event. */
  public final String event;

  /**
   * Constructs an EventMarker with the specified parameters.
   *
   * @param timestamp The timestamp of the event.
   * @param event The event.
   */
  public EventMarker(double timestamp, String event) {
    this.timestamp = timestamp;
    this.event = event;
  }

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
