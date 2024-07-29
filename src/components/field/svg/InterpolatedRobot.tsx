import { observer } from "mobx-react";
import React, { Component } from "react";
import {doc, uiState} from "../../../document/DocumentManager";
import { sample } from "../../../util/MathUtil";

type Props = {
  timestamp: number;
};

type State = object;

class InterpolatedRobot extends Component<Props, State> {
  

  state = {};

  render() {
    if (doc.pathlist.activePath.generated.length < 2) {
      return <></>;
    }
    const pose1 = sample(
      this.props.timestamp,
      doc.pathlist.activePath.generated
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
            d={doc.robotConfig.bumperSVGElement()}
          ></path>
          <clipPath id={"robot-clip"}>
            <use xlinkHref={"#robot-bumpers"} />
          </clipPath>
        </defs>

        <use
          xlinkHref={"#robot-bumpers"}
          clipPath={"url(#robot-clip)"}
          stroke={"white"}
          strokeWidth={5 * uiState.fieldScalingFactor}
          fill={"transparent"}
          vectorEffect={"non-scaling-stroke"}
          style={{ pointerEvents: "none" }}
        />
        <circle
          cx={doc.robotConfig.bumperLength.value / 2}
          cy={0}
          r={0.1}
          fill="white"
        ></circle>
        {/* Wheel locations */}
        <circle
          cx={doc.robotConfig.wheelbase.value / 2}
          cy={doc.robotConfig.trackWidth.value / 2}
          r={doc.robotConfig.wheelRadius.value}
          fill="white"
        ></circle>
        <circle
          cx={doc.robotConfig.wheelbase.value / 2}
          cy={-doc.robotConfig.trackWidth.value / 2}
          r={doc.robotConfig.wheelRadius.value}
          fill="white"
        ></circle>
        <circle
          cx={-doc.robotConfig.wheelbase.value / 2}
          cy={-doc.robotConfig.trackWidth.value / 2}
          r={doc.robotConfig.wheelRadius.value}
          fill="white"
        ></circle>
        <circle
          cx={-doc.robotConfig.wheelbase.value / 2}
          cy={doc.robotConfig.trackWidth.value / 2}
          r={doc.robotConfig.wheelRadius.value}
          fill="white"
        ></circle>
      </g>
    );
  }
}

export default observer(InterpolatedRobot);
