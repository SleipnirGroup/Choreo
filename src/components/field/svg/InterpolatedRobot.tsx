import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import { sample } from "../../../util/MathUtil";

type Props = {
  timestamp: number;
};

type State = object;

const targetRadius = 0.1;

// Find the side length that makes an equilateral triangle have the same area as
// a circle.
//
//   triangle area = circle area
//   1/2 bh = πr²
//
// An equilateral triangle with side length l has a height of √3/2 l.
//
//   1/2 (l)(√3/2 l) = πr²
//   √3/4 l² = πr²
//   l² = 4πr²/√3
//   l = √(4πr²/√3)
//   l = 2r√(π/√3)
//   l = 2r√(π√3/3)
const targetSideLength =
  2 * targetRadius * Math.sqrt((Math.PI * Math.sqrt(3)) / 3);

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

    const headingPointSideLength =
      targetSideLength *
      Math.min(
        this.context.model.document.robotConfig.bumperLength,
        this.context.model.document.robotConfig.bumperWidth
      );
    const headingPointHeight = (Math.sqrt(3) / 2) * headingPointSideLength;

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
        {/* Heading point */}
        <polygon
          transform={`translate(${this.context.model.document.robotConfig.bumperLength / 2},0)`}
          fill="white"
          points={
            `${-headingPointHeight / 2},${headingPointSideLength / 2} ` +
            `${-headingPointHeight / 2},${-headingPointSideLength / 2} ` +
            `${headingPointHeight / 2},${0} `
          }
        ></polygon>
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
