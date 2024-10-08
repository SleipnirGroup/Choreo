// Copyright (c) Choreo contributors

package choreo.trajectory;

import com.google.gson.JsonDeserializationContext;
import com.google.gson.JsonDeserializer;
import com.google.gson.JsonElement;
import com.google.gson.JsonParseException;
import java.lang.reflect.Type;

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
  /** GSON deserializer for choreolib event markers */
  public static class Deserializer implements JsonDeserializer<EventMarker> {
    /** Default constructor. */
    public Deserializer() {}

    public EventMarker deserialize(
        JsonElement json, Type typeOfT, JsonDeserializationContext context)
        throws JsonParseException {
      try {
        var targetTimestamp =
            json.getAsJsonObject()
                .get("data")
                .getAsJsonObject()
                .get("targetTimestamp")
                .getAsDouble();
        var offset =
            json.getAsJsonObject()
                .get("data")
                .getAsJsonObject()
                .get("offset")
                .getAsJsonObject()
                .get("val")
                .getAsDouble();
        var event =
            json.getAsJsonObject()
                .get("event")
                .getAsJsonObject()
                .get("data")
                .getAsJsonObject()
                .get("event")
                .getAsString();

        return new EventMarker(targetTimestamp + offset, event);
      } catch (IllegalStateException e) {
        return new EventMarker(0, "");
      }
    }
  }

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
