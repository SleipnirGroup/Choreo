import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import { sample } from "../../../util/MathUtil";

type Props = {
  timestamp: number;
};

type State = object;

class InterpolatedRobot extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    if (this.context.model.document.pathlist.activePath.generated.length < 2) {
      return <></>;
    }
    const pose1 = sample(
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
