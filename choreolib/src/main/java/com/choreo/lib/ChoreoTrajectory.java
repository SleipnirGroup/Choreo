package com.choreo.lib;

import edu.wpi.first.math.geometry.Pose2d;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;

@AllArgsConstructor
public class ChoreoTrajectory {
  private final List<ChoreoTrajectoryState> samples;

  /**
   * Create an empty ChoreoTrajectory.
   */
  public ChoreoTrajectory() {
    samples = List.of();
  }

  private ChoreoTrajectoryState sampleInternal(double timestamp) {
    if (timestamp < samples.get(0).timestamp) {
      return samples.get(0);
    }
    if (timestamp > getTotalTime()) {
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
   * @param timestamp The timestamp of this sample relative to the beginning of the trajectory.
   * @return The ChoreoTrajectoryState at the given time.
   */
  public ChoreoTrajectoryState sample(double timestamp) {
    return sample(timestamp, false);
  }

  /**
   * Return an interpolated sample of the trajectory at the given timestamp.
   * @param timestamp The timestamp of this sample relative to the beginning of the trajectory.
   * @param whether or not to return the sample as mirrored across the field midline (as in 2023).
   * @return The ChoreoTrajectoryState at the given time.
   */
  public ChoreoTrajectoryState sample(double timestamp, boolean mirrorForRedAlliance) {
    var state = sampleInternal(timestamp);
    return mirrorForRedAlliance ? state.flipped() : state;
  }

  /**
   * @return the initial, non-mirrored pose of the trajectory.
   */
  public Pose2d getInitialPose() {
    return samples.get(0).getPose();
  }

  /**
   * @return the final, non-mirrored pose of the trajectory.
   */
  public Pose2d getFinalPose() {
    return samples.get(samples.size() - 1).getPose();
  }

  /**
   * @return the total time of the trajectory (the timestamp of the last sample)
   */
  public double getTotalTime() {
    return samples.get(samples.size() - 1).timestamp;
  }

  /**
   * @return the array of poses corresponding to the trajectory.
   */
  public Pose2d[] getPoses() {
    return samples.stream().map(ChoreoTrajectoryState::getPose).toArray(Pose2d[]::new);
  }

  /**
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
