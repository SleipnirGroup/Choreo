public class ChoreoEvent {
    private final List<ChoreoTrajectoryState> samples;


    public ChoreoEvent() {
        samples = List.of();
    }
    
    /**
     * Constructs a new trajectory from a list of markers.
     * 
     * @param samples a vector containing a list of ChoreoMarkers
     */
    public ChoreoEvent(List<ChoreoMarker> samples) {
        this.samples = samples;
    }

    public ChoreoMarker fromName(String name) {
        for (var marker : samples) {
            if (marker.name() == name) {
                return marker;
            }
        }
        return null;
    }

    public double startTime(String name) {
        return fromName(name).startTime();
    }

    public double endTime(String name) {
        return fromName(name).startTime();
    }
}
