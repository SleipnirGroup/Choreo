package com.choreo.lib.trajectory;

public class ChoreoEventMarker {
    public final double timestamp;
    public final String event;

    public ChoreoEventMarker(double timestamp, String event) {
        this.timestamp = timestamp;
        this.event = event;
    }

    public ChoreoEventMarker offsetTimestamp(double offset) {
        return new ChoreoEventMarker(timestamp + offset, event);
    }
}
