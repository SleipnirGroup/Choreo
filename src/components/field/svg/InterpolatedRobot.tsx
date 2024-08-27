import { observer } from "mobx-react";
import React, { Component } from "react";
import { doc, uiState } from "../../../document/DocumentManager";
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
  state = {};

  render() {
    const traj = doc.pathlist.activePath.traj.fullTraj;
    if (traj.length < 2) {
      return <></>;
    }
    const pose1 = sample(this.props.timestamp, traj);

    const headingPointSideLength =
      targetSideLength *
      Math.min(doc.robotConfig.bumper.length, doc.robotConfig.bumper.width);
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
        {/* Heading point */}
        <polygon
          transform={`translate(${doc.robotConfig.bumper.length / 2},0)`}
          fill="white"
          points={
            `${-headingPointHeight / 2},${headingPointSideLength / 2} ` +
            `${-headingPointHeight / 2},${-headingPointSideLength / 2} ` +
            `${headingPointHeight / 2},${0} `
          }
        ></polygon>
        {/* Wheel locations */}
        {doc.robotConfig.modules.map((mod) => (
          <circle
            cx={mod.x.value}
            cy={mod.y.value}
            r={doc.robotConfig.radius.value}
            fill="white"
          ></circle>
        ))}
      </g>
    );
  }
}

export default observer(InterpolatedRobot);
