// Copyright (c) Choreo contributors

package com.choreo.lib;

import edu.wpi.first.math.geometry.Pose2d;
import java.util.ArrayList;
import java.util.List;

/** A trajectory loaded from Choreo. */
public class ChoreoTrajectory {
  private final List<ChoreoTrajectoryState> samples;
  private final List<ChoreoMarker> events;

  private static final ChoreoMarker nullMarker = new ChoreoMarker("null", 1, 0);

  /** Create an empty ChoreoTrajectory. */
  public ChoreoTrajectory() {
    samples = List.of();
    events = List.of();
  }

  /**
   * Constructs a new trajectory from a list of trajectory states, without event markers.
   *
   * @param samples a vector containing a list of ChoreoTrajectoryStates
   */
  public ChoreoTrajectory(List<ChoreoTrajectoryState> samples) {
    this.samples = samples;
    events = List.of();
  }

  /**
   * Constructs a new trajectory from a list of trajectory states, with event markers included from
   * a list of markers.
   *
   * @param samples a vector containing a list of ChoreoTrajectoryStates
   * @param events a vector containing a list of ChoreoMarkers
   */
  public ChoreoTrajectory(List<ChoreoTrajectoryState> samples, List<ChoreoMarker> events) {
    this.samples = samples;
    this.events = events;
  }

  /**
   * Returns the first ChoreoTrajectoryState in the trajectory.
   *
   * @return The first ChoreoTrajectoryState in the trajectory.
   */
  public ChoreoTrajectoryState getInitialState() {
    return samples.get(0);
  }

  /**
   * Returns the last ChoreoTrajectoryState in the trajectory.
   *
   * @return The last ChoreoTrajectoryState in the trajectory.
   */
  public ChoreoTrajectoryState getFinalState() {
    return samples.get(samples.size() - 1);
  }

  private ChoreoTrajectoryState sampleInternal(double timestamp) {
    if (timestamp < samples.get(0).timestamp) {
      return samples.get(0);
    }
    if (timestamp >= getTotalTime()) {
      return samples.get(samples.size() - 1);
    }

    int low = 0;
    int high = samples.size() - 1;

    while (low != high) {
      int mid = (low + high) / 2;
      if (samples.get(mid).timestamp < timestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    if (low == 0) {
      return samples.get(low);
    }

    var behindState = samples.get(low - 1);
    var aheadState = samples.get(low);

    if ((aheadState.timestamp - behindState.timestamp) < 1e-6) {
      return aheadState;
    }

    return behindState.interpolate(aheadState, timestamp);
  }

  /**
   * Return an interpolated, non-mirrored sample of the trajectory at the given timestamp.
   *
   * @param timestamp The timestamp of this sample relative to the beginning of the trajectory.
   * @return The ChoreoTrajectoryState at the given time.
   */
  public ChoreoTrajectoryState sample(double timestamp) {
    return sample(timestamp, false);
  }

  /**
   * Return an interpolated sample of the trajectory at the given timestamp.
   *
   * @param timestamp The timestamp of this sample relative to the beginning of the trajectory.
   * @param mirrorForRedAlliance whether or not to return the sample as mirrored across the field
   *     midline (as in 2023).
   * @return The ChoreoTrajectoryState at the given time.
   */
  public ChoreoTrajectoryState sample(double timestamp, boolean mirrorForRedAlliance) {
    var state = sampleInternal(timestamp);
    return mirrorForRedAlliance ? state.flipped() : state;
  }

  /**
   * Returns the list of states for this trajectory.
   *
   * @return this trajectory's states.
   */
  public List<ChoreoTrajectoryState> getSamples() {
    return samples;
  }

  /**
   * Finds the event marker in the ChoreoEvent by name.
   *
   * @param name The name of the event marker.
   * @return The event marker, with the specified name, in this ChoreoEvent.
   */
  public ChoreoMarker markerFromName(String name) {
    for (ChoreoMarker marker : events) {
      if (marker.name() == name) {
        return marker;
      }
    }
    return nullMarker;
    // If there is no marker of that name in the trajectory, it will return a defective marker that
    // can never trigger.
  }

  /**
   * Returns the initial, non-mirrored pose of the trajectory.
   *
   * @return the initial, non-mirrored pose of the trajectory.
   */
  public Pose2d getInitialPose() {
    return samples.get(0).getPose();
  }

  /**
   * Returns the initial, mirrored pose of the trajectory.
   *
   * @return the initial, mirrored pose of the trajectory.
   */
  public Pose2d getFlippedInitialPose() {
    return samples.get(0).flipped().getPose();
  }

  /**
   * Returns the final, non-mirrored pose of the trajectory.
   *
   * @return the final, non-mirrored pose of the trajectory.
   */
  public Pose2d getFinalPose() {
    return samples.get(samples.size() - 1).getPose();
  }

  /**
   * Returns the final, mirrored pose of the trajectory.
   *
   * @return the final, mirrored pose of the trajectory.
   */
  public Pose2d getFlippedFinalPose() {
    return samples.get(samples.size() - 1).flipped().getPose();
  }

  /**
   * Returns the total time of the trajectory (the timestamp of the last sample)
   *
   * @return the total time of the trajectory (the timestamp of the last sample)
   */
  public double getTotalTime() {
    return samples.get(samples.size() - 1).timestamp;
  }

  /**
   * Returns the array of poses corresponding to the trajectory.
   *
   * @return the array of poses corresponding to the trajectory.
   */
  public Pose2d[] getPoses() {
    return samples.stream().map(ChoreoTrajectoryState::getPose).toArray(Pose2d[]::new);
  }

  /**
   * Returns this trajectory, mirrored across the field midline.
   *
   * @return this trajectory, mirrored across the field midline.
   */
  public ChoreoTrajectory flipped() {
    var flippedStates = new ArrayList<ChoreoTrajectoryState>();
    for (var state : samples) {
      flippedStates.add(state.flipped());
    }
    return new ChoreoTrajectory(flippedStates);
  }
}
