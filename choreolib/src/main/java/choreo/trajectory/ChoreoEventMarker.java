package choreo.trajectory;

/** A marker for an event in a trajectory. */
public class ChoreoEventMarker {
  /** The timestamp of this event, relative to the beginning of the trajectory. */
  public final double timestamp;

  /** The name/key of the event. */
  public final String event;

  /**
   * Constructs a ChoreoEventMarker with the specified parameters.
   *
   * @param timestamp The timestamp of this event, relative to the beginning of the trajectory.
   * @param event The name/key of the event.
   */
  public ChoreoEventMarker(double timestamp, String event) {
    this.timestamp = timestamp;
    this.event = event;
  }
}
