// Copyright (c) Choreo contributors

package choreo.trajectory;

import edu.wpi.first.math.geometry.Pose2d;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** A trajectory loaded from Choreo. */
public record ChoreoTrajectory<SampleType extends TrajSample<SampleType>> (
  String name,
  List<SampleType> samples,
  List<Integer> splits,
  List<EventMarker> events
) {
  /**
   * Returns the first ChoreoTrajectoryState in the trajectory.
   *
   * @return The first ChoreoTrajectoryState in the trajectory.
   */
  public SampleType getInitialState() {
    return samples.get(0);
  }

  /**
   * Returns the last ChoreoTrajectoryState in the trajectory.
   *
   * @return The last ChoreoTrajectoryState in the trajectory.
   */
  public SampleType getFinalSample() {
    return samples.get(samples.size() - 1);
  }

  private SampleType sampleInternal(double timestamp) {
    if (timestamp < samples.get(0).getTimestamp()) {
      // timestamp oob, return the initial state
      return getInitialState();
    }
    if (timestamp >= getTotalTime()) {
      // timestamp oob, return the final state
      return getFinalSample();
    }

    // binary search to find the sample before and ahead of the timestamp
    int low = 0;
    int high = samples.size() - 1;

    while (low != high) {
      int mid = (low + high) / 2;
      if (samples.get(mid).getTimestamp() < timestamp) {
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

    if ((aheadState.getTimestamp() - behindState.getTimestamp()) < 1e-6) {
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
  public SampleType sampleAt(double timestamp) {
    return sampleAt(timestamp, false);
  }

  /**
   * Return an interpolated sample of the trajectory at the given timestamp.
   *
   * @param timestamp The timestamp of this sample relative to the beginning of the trajectory.
   * @param mirrorForRedAlliance whether or not to return the sample as mirrored across the field
   *     midline (as in 2023).
   * @return The ChoreoTrajectoryState at the given time.
   */
  public SampleType sampleAt(double timestamp, boolean mirrorForRedAlliance) {
    var state = sampleInternal(timestamp);
    return mirrorForRedAlliance ? state.flipped() : state;
  }

  /**
   * Returns the initial pose of the trajectory.
   *
   * @param mirrorForRedAlliance whether or not to return the pose as mirrored across the field
   * @return the initial pose of the trajectory.
   */
  public Pose2d getInitialPose(boolean mirrorForRedAlliance) {
    if (mirrorForRedAlliance) {
      return samples.get(0).flipped().getPose();
    }
    return samples.get(0).getPose();
  }

  /**
   * Returns the final pose of the trajectory.
   *
   * @param mirrorForRedAlliance whether or not to return the pose as mirrored across the field
   * @return the final pose of the trajectory.
   */
  public Pose2d getFinalPose(boolean mirrorForRedAlliance) {
    if (mirrorForRedAlliance) {
      return samples.get(samples.size() - 1).flipped().getPose();
    }
    return samples.get(samples.size() - 1).getPose();
  }

  /**
   * Returns the total time of the trajectory (the timestamp of the last sample)
   *
   * @return the total time of the trajectory (the timestamp of the last sample)
   */
  public double getTotalTime() {
    return samples.get(samples.size() - 1).getTimestamp();
  }

  /**
   * Returns the array of poses corresponding to the trajectory.
   *
   * @return the array of poses corresponding to the trajectory.
   */
  public Pose2d[] getPoses() {
    return samples.stream().map(SampleType::getPose).toArray(Pose2d[]::new);
  }

  /**
   * Returns this trajectory, mirrored across the field midline.
   *
   * @return this trajectory, mirrored across the field midline.
   */
  public ChoreoTrajectory<SampleType> flipped() {
    var flippedStates = new ArrayList<SampleType>();
    for (var state : samples) {
      flippedStates.add(state.flipped());
    }
    return new ChoreoTrajectory<SampleType>(this.name, flippedStates, this.splits, this.events);
  }

  /**
   * Returns a list of all events with the given name in the trajectory.
   *
   * @param eventName The name of the event.
   * @return A list of all events with the given name in the trajectory, if no events are found, an
   *     empty list is returned.
   */
  public List<EventMarker> getEvents(String eventName) {
    return events.stream().filter(event -> event.event().equals(eventName)).toList();
  }

  public Optional<ChoreoTrajectory<SampleType>> getSplit(int splitIndex) {
    if (splitIndex < 0 || splitIndex >= splits.size()) {
      return Optional.empty();
    }
    int start = splits.get(splitIndex);
    int end = splitIndex + 1 < splits.size() ? splits.get(splitIndex + 1) + 1 : samples.size();
    var sublist = samples.subList(start, end);
    double startTime = sublist.get(0).getTimestamp();
    double endTime = sublist.get(sublist.size() - 1).getTimestamp();
    return Optional.of(
      new ChoreoTrajectory<SampleType>(
        this.name + "[" + splitIndex + "]",
        sublist.stream().map(s -> s.offsetBy(-startTime)).toList(),
        List.of(),
        events.stream()
          .filter(e -> e.timestamp() >= startTime && e.timestamp() <= endTime)
          .map(e -> e.offsetBy(-startTime))
          .toList()
      ));
  }
}
