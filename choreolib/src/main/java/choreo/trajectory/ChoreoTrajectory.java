// Copyright (c) Choreo contributors

package choreo.trajectory;

import edu.wpi.first.math.geometry.Pose2d;
import java.util.ArrayList;
import java.util.List;

/** A trajectory loaded from Choreo. */
public class ChoreoTrajectory {
  private final String name;
  private final List<ChoreoTrajectoryState> samples;
  private final List<ChoreoEventMarker> events;

  /** Create an empty ChoreoTrajectory. */
  public ChoreoTrajectory() {
    name = "Empty Trajctory";
    samples = List.of();
    events = List.of();
  }

  /**
   * Constructs a new trajectory from a list of trajectory states
   *
   * @param name the name of the trajectory
   * @param samples a vector containing a list of ChoreoTrajectoryStates
   * @param events a vector containing a list of ChoreoEventMarkers
   */
  public ChoreoTrajectory(
      String name, List<ChoreoTrajectoryState> samples, List<ChoreoEventMarker> events) {
    this.name = name;
    this.samples = samples;
    this.events = events;
  }

  /**
   * Returns the name stored in the trajectory from the Choreo app
   *
   * <p>Note: Don't use this for equality checks or assertion has this has no promise to stay
   * identical between choreo versions
   *
   * @return Returns the name of the trajecotry
   */
  public String name() {
    return name;
  }

  /**
   * Returns a new trajectory with the given name
   * 
   * @param name the new name of the trajectory
   * @return a new trajectory with the given name
   */
  public ChoreoTrajectory withName(String name) {
    return new ChoreoTrajectory(name, samples, events);
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
      // timestamp oob, return the initial state
      return getInitialState();
    }
    if (timestamp >= getTotalTime()) {
      // timestamp oob, return the final state
      return getFinalState();
    }

    // binary search to find the sample before and ahead of the timestamp
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
    return new ChoreoTrajectory(name, flippedStates, this.events);
  }

  /**
   * Returns a list of all events with the given name in the trajectory.
   *
   * @param eventName The name of the event.
   * @return A list of all events with the given name in the trajectory, if no events are found, an
   *     empty list is returned.
   */
  public List<ChoreoEventMarker> getEvents(String eventName) {
    return events.stream().filter(event -> event.event.equals(eventName)).toList();
  }
}
