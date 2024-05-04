package com.choreo.lib;

/** An event marker loaded from Choreo. */
public class ChoreoMarker {
  private String name;
  private double startTime;
  private double endTime;

  /**
   * Creates a new ChoreoMarker.
   *
   * @param name The name of the ChoreoMarker.
   * @param startTime The start time for the ChoreoMarker to activate.
   * @param endTime The end time, when the ChoreoMarker stops activating.
   */
  public ChoreoMarker(String name, double startTime, double endTime) {
    this.name = name;
    this.startTime = startTime;
    this.endTime = endTime;
  }

  /**
   * @return The name of the marker.
   */
  public String name() {
    return name;
  }

  /**
   * @return The start time of the marker.
   */
  public double startTime() {
    return startTime;
  }

  /**
   * @return The end time of the marker.
   */
  public double endTime() {
    return endTime;
  }
}
