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
  /** The "data" component of the marker serialization */
  private class EventMarkerData {
    /** The timestamp of the marker. */
    public final double timestamp;

    /**
     * Constructor
     *
     * @param target_timestamp The timestamp of the waypoint the marker is attached to.
     * @param offset The time offset from target_timestamp.
     */
    public EventMarkerData(double target_timestamp, Expression offset) {
      timestamp = target_timestamp + offset.val;
    }
  }

  private class ChoreolibEvent {
    public ChoreolibEventData data;
    public ChoreolibEvent(ChoreolibEventData data){
      this.data = data;
    }
  }
  /** The "data" component of the marker serialization */
  private class ChoreolibEventData {
    /** The event string */
    public final String event;

    /**
     * Constructor
     *
     * @param event The event string
     */
    public ChoreolibEventData(String event) {
      this.event = event;
    }
  }

  /** The timestamp of the event. */
  public final double timestamp;

  /** The event. */
  public final String event;

  /**
   * Construct an Event Marker from deserialized components
   *
   * @param data the data component
   * @param event the event component
   */
  public EventMarker(EventMarkerData data, ChoreolibEvent event) {
    this.timestamp = data.timestamp;
    this.event = event.data.event;
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
