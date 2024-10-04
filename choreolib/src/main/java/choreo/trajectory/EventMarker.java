// Copyright (c) Choreo contributors

package choreo.trajectory;

import choreo.trajectory.ProjectFile.Expression;

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
  private class EventMarkerData {
    public final double timestamp;
    public EventMarkerData(double target_timestamp, Expression offset) {
      timestamp = target_timestamp + offset.val;
    }
  }

  private class ChoreolibEvent {
    public final String event;
    public ChoreolibEvent(String event) {
      this.event = event;
    }
  }

  /** The timestamp of the event. */
  public final double timestamp;

  /** The event. */
  public final String event;


  public EventMarker(EventMarkerData data, ChoreolibEvent event) {
    this.timestamp = data.timestamp;
    this.event = event.event;
  }

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
