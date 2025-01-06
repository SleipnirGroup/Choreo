// Copyright (c) Choreo contributors

package choreo.trajectory;

import edu.wpi.first.math.geometry.Pose2d;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * A trajectory loaded from Choreo.
 *
 * @param <SampleType> DifferentialSample or SwerveSample.
 */
public class Trajectory<SampleType extends TrajectorySample<SampleType>> {
  private final String name;
  private final List<SampleType> samples;
  private final List<Integer> splits;
  private final List<EventMarker> events;

  /**
   * Constructs a Trajectory with the specified parameters.
   *
   * @param name The name of the trajectory.
   * @param samples The samples of the trajectory.
   * @param splits The indices of the splits in the trajectory.
   * @param events The events in the trajectory.
   */
  public Trajectory(
      String name, List<SampleType> samples, List<Integer> splits, List<EventMarker> events) {
    this.name = name;
    this.samples = samples;
    this.splits = splits;
    this.events = events;
  }

  /**
   * Returns the name of the trajectory.
   *
   * @return the name of the trajectory.
   */
  public String name() {
    return name;
  }

  /**
   * Returns the samples of the trajectory.
   *
   * @return the samples of the trajectory.
   */
  public List<SampleType> samples() {
    return samples;
  }

  /**
   * Returns the indices of the splits in the trajectory.
   *
   * @return the indices of the splits in the trajectory.
   */
  public List<Integer> splits() {
    return splits;
  }

  /**
   * Returns the events in the trajectory.
   *
   * @return the events in the trajectory.
   */
  public List<EventMarker> events() {
    return events;
  }

  /**
   * Returns the first {@link SampleType} in the trajectory.
   *
   * <p>This function will return an empty Optional if the trajectory is empty.
   *
   * @param mirrorForRedAlliance whether or not to return the sample as mirrored across the field
   * @return The first {@link SampleType} in the trajectory.
   */
  public Optional<SampleType> getInitialSample(boolean mirrorForRedAlliance) {
    if (samples.isEmpty()) {
      return Optional.empty();
    }
    final var sample = samples.get(0);
    return Optional.of(mirrorForRedAlliance ? sample.flipped() : sample);
  }

  /**
   * Returns the last {@link SampleType} in the trajectory.
   *
   * <p>This function will return an empty Optional if the trajectory is empty.
   *
   * @param mirrorForRedAlliance whether or not to return the sample as mirrored across the field
   * @return The last {@link SampleType} in the trajectory.
   */
  public Optional<SampleType> getFinalSample(boolean mirrorForRedAlliance) {
    if (samples.isEmpty()) {
      return Optional.empty();
    }
    final var sample = samples.get(samples.size() - 1);
    return Optional.of(mirrorForRedAlliance ? sample.flipped() : sample);
  }

  private Optional<SampleType> sampleInternal(double timestamp) {
    if (samples.isEmpty()) {
      return Optional.empty();
    } else if (samples.size() == 1) {
      return Optional.of(samples.get(0));
    }
    if (timestamp < samples.get(0).getTimestamp()) {
      // timestamp oob, return the initial state
      return getInitialSample(false);
    }
    if (timestamp >= getTotalTime()) {
      // timestamp oob, return the final state
      return getFinalSample(false);
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
      return Optional.of(samples.get(low));
    }

    var behindState = samples.get(low - 1);
    var aheadState = samples.get(low);

    if ((aheadState.getTimestamp() - behindState.getTimestamp()) < 1e-6) {
      return Optional.of(aheadState);
    }

    return Optional.of(behindState.interpolate(aheadState, timestamp));
  }

  /**
   * Return an interpolated sample of the trajectory at the given timestamp.
   *
   * <p>This function will return an empty Optional if the trajectory is empty.
   *
   * @param timestamp The timestamp of this sample relative to the beginning of the trajectory.
   * @param mirrorForRedAlliance whether or not to return the sample as mirrored across the field
   *     midline (as in 2023).
   * @return The SampleType at the given time.
   */
  public Optional<SampleType> sampleAt(double timestamp, boolean mirrorForRedAlliance) {
    Optional<SampleType> state = sampleInternal(timestamp);
    return mirrorForRedAlliance ? state.map(SampleType::flipped) : state;
  }

  /**
   * Returns the initial pose of the trajectory.
   *
   * <p>This function will return an empty Optional if the trajectory is empty.
   *
   * @param mirrorForRedAlliance whether or not to return the pose as mirrored across the field
   * @return the initial pose of the trajectory.
   */
  public Optional<Pose2d> getInitialPose(boolean mirrorForRedAlliance) {
    if (samples.isEmpty()) {
      return Optional.empty();
    }
    return getInitialSample(mirrorForRedAlliance).map(SampleType::getPose);
  }

  /**
   * Returns the final pose of the trajectory.
   *
   * <p>This function will return an empty Optional if the trajectory is empty.
   *
   * @param mirrorForRedAlliance whether or not to return the pose as mirrored across the field
   * @return the final pose of the trajectory.
   */
  public Optional<Pose2d> getFinalPose(boolean mirrorForRedAlliance) {
    if (samples.isEmpty()) {
      return Optional.empty();
    }
    return getFinalSample(mirrorForRedAlliance).map(SampleType::getPose);
  }

  /**
   * Returns the total time of the trajectory (the timestamp of the last sample). This will return 0
   * if the trajectory is empty.
   *
   * @return the total time of the trajectory (the timestamp of the last sample)
   */
  public double getTotalTime() {
    return getFinalSample(false).map(SampleType::getTimestamp).orElse(0.0);
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
  public Trajectory<SampleType> flipped() {
    var flippedStates = new ArrayList<SampleType>();
    for (var state : samples) {
      flippedStates.add(state.flipped());
    }
    return new Trajectory<SampleType>(this.name, flippedStates, this.splits, this.events);
  }

  /**
   * Returns a list of all events with the given name in the trajectory.
   *
   * @param eventName The name of the event.
   * @return A list of all events with the given name in the trajectory, if no events are found, an
   *     empty list is returned.
   */
  public List<EventMarker> getEvents(String eventName) {
    return events.stream().filter(event -> event.event.equals(eventName)).toList();
  }

  /**
   * Returns a choreo trajectory that represents the split of the trajectory at the given index.
   *
   * @param splitIndex the index of the split trajectory to return.
   * @return a choreo trajectory that represents the split of the trajectory at the given index.
   */
  public Optional<Trajectory<SampleType>> getSplit(int splitIndex) {
    if (splitIndex < 0 || splitIndex >= splits.size()) {
      return Optional.empty();
    }
    int start = splits.get(splitIndex);
    int end = splitIndex + 1 < splits.size() ? splits.get(splitIndex + 1) + 1 : samples.size();
    var sublist = samples.subList(start, end);
    double startTime = sublist.get(0).getTimestamp();
    double endTime = sublist.get(sublist.size() - 1).getTimestamp();
    return Optional.of(
        new Trajectory<SampleType>(
            this.name + "[" + splitIndex + "]",
            sublist.stream().map(s -> s.offsetBy(-startTime)).toList(),
            List.of(),
            events.stream()
                .filter(e -> e.timestamp >= startTime && e.timestamp <= endTime)
                .map(e -> e.offsetBy(-startTime))
                .toList()));
  }

  @Override
  public boolean equals(Object obj) {
    if (!(obj instanceof Trajectory<?>)) {
      return false;
    }

    var other = (Trajectory<?>) obj;
    return this.name.equals(other.name)
        && this.samples.equals(other.samples)
        && this.splits.equals(other.splits)
        && this.events.equals(other.events);
  }
}
