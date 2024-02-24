import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import { ITrajectorySampleStore } from "../../../document/DocumentModel";

type Props = {
  timestamp: number;
};

type State = object;

type Pose = { x: number; y: number; rot: number };

class InterpolatedRobot extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  storeToPose(store: ITrajectorySampleStore) {
    return { x: store.x, y: store.y, rot: store.heading };
  }
  interpolate(p1: Pose, p2: Pose, frac: number) {
    const rot1 = p1.rot;
    const rot2 = p2.rot;

    const shortest_angle =
      ((((rot2 - rot1) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) -
      Math.PI;
    return {
      x: p1.x + frac * (p2.x - p1.x),
      y: p1.y + frac * (p2.y - p1.y),
      rot: p1.rot + frac * shortest_angle
    };
  }

  // This came from WPILib Java's Trajectory sample() method

  sample(timeSeconds: number, m_states: Array<ITrajectorySampleStore>): Pose {
    if (timeSeconds <= m_states[0].timestamp) {
      return this.storeToPose(m_states[0]);
    }
    if (timeSeconds >= m_states[m_states.length - 1].timestamp) {
      return this.storeToPose(m_states[m_states.length - 1]);
    }

    // To get the element that we want, we will use a binary search algorithm
    // instead of iterating over a for-loop. A binary search is O(std::log(n))
    // whereas searching using a loop is O(n).

    // This starts at 1 because we use the previous state later on for
    // interpolation.
    let low = 1;
    let high = m_states.length - 1;

    while (low !== high) {
      const mid = Math.floor((low + high) / 2);
      if (m_states[mid].timestamp < timeSeconds) {
        // This index and everything under it are less than the requested
        // timestamp. Therefore, we can discard them.
        low = mid + 1;
      } else {
        // t is at least as large as the element at this index. This means that
        // anything after it cannot be what we are looking for.
        high = mid;
      }
    }

    // High and Low should be the same.

    // The sample's timestamp is now greater than or equal to the requested
    // timestamp. If it is greater, we need to interpolate between the
    // previous state and the current state to get the exact state that we
    // want.
    const sample = m_states[low];
    const prevSample = m_states[low - 1];

    // If the difference in states is negligible, then we are spot on!
    if (Math.abs(sample.timestamp - prevSample.timestamp) < 1e-9) {
      return this.storeToPose(sample);
    }
    // Interpolate between the two states for the state that we want.
    return this.interpolate(
      this.storeToPose(prevSample),
      this.storeToPose(sample),
      (timeSeconds - prevSample.timestamp) /
        (sample.timestamp - prevSample.timestamp)
    );
  }

  render() {
    if (this.context.model.document.pathlist.activePath.generated.length < 2) {
      return <></>;
    }
    const pose1 = this.sample(
      this.props.timestamp,
      this.context.model.document.pathlist.activePath.generated
    );
    return (
      <g
        transform={`translate(${pose1.x}, ${pose1.y}) rotate(${
          (pose1.rot * 180) / Math.PI
        })`}
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <path
            id={"robot-bumpers"}
            d={this.context.model.document.robotConfig.bumperSVGElement()}
          ></path>
          <clipPath id={"robot-clip"}>
            <use xlinkHref={"#robot-bumpers"} />
          </clipPath>
        </defs>

        <use
          xlinkHref={"#robot-bumpers"}
          clipPath={"url(#robot-clip)"}
          stroke={"white"}
          strokeWidth={5 * this.context.model.uiState.fieldScalingFactor}
          fill={"transparent"}
          vectorEffect={"non-scaling-stroke"}
          style={{ pointerEvents: "none" }}
        />
        <circle
          cx={this.context.model.document.robotConfig.bumperLength / 2}
          cy={0}
          r={0.1}
          fill="white"
        ></circle>
        {/* Wheel locations */}
        <circle
          cx={this.context.model.document.robotConfig.wheelbase / 2}
          cy={this.context.model.document.robotConfig.trackWidth / 2}
          r={this.context.model.document.robotConfig.wheelRadius}
          fill="white"
        ></circle>
        <circle
          cx={this.context.model.document.robotConfig.wheelbase / 2}
          cy={-this.context.model.document.robotConfig.trackWidth / 2}
          r={this.context.model.document.robotConfig.wheelRadius}
          fill="white"
        ></circle>
        <circle
          cx={-this.context.model.document.robotConfig.wheelbase / 2}
          cy={-this.context.model.document.robotConfig.trackWidth / 2}
          r={this.context.model.document.robotConfig.wheelRadius}
          fill="white"
        ></circle>
        <circle
          cx={-this.context.model.document.robotConfig.wheelbase / 2}
          cy={this.context.model.document.robotConfig.trackWidth / 2}
          r={this.context.model.document.robotConfig.wheelRadius}
          fill="white"
        ></circle>
      </g>
    );
  }
}

export default observer(InterpolatedRobot);
