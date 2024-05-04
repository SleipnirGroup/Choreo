package com.choreo.lib;

public class ChoreoMarker {
    private String name;
    private double startTime;
    private double endTime;

    public ChoreoMarker(String name, double startTime, double endTime) {
        this.name = name;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public String name() {
        return name;
    }

    public double startTime() {
        return startTime;
    }

    public double endTime() {
        return endTime;
    }
}
