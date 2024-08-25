import { Component } from "react";
import { doc } from "../../../document/DocumentManager";

import { observer } from "mobx-react";

type Props = object;

type State = object;

class FieldSamples extends Component<Props, State> {
  state = {};

  render() {
    const path = doc.pathlist.activePath;
    return (
      <>
        {path.snapshot.waypoints.map((point, idx) => {
          let color = "white";
          if (idx === 0) {
            color = "green";
          } else if (idx === path.snapshot.waypoints.length - 1) {
            color = "red";
          }
          if (point.fixHeading) {
            return (
              <g
                transform={` translate(${point.x}, ${point.y}) rotate(${
                  (point.heading * 180) / Math.PI
                })`}
              >
                <circle cx={0} cy={0} r={0.04} fill={color}></circle>
                <circle cx={0.1} cy={0} r={0.04} fill={color}></circle>
                <rect
                  x={-0.1}
                  y={-0.1}
                  width={0.2}
                  height={0.2}
                  stroke={color}
                  strokeWidth={0.04}
                  fill="none"
                ></rect>
              </g> // Full
            );
          } else if (point.fixTranslation) {
            return (
              <circle cx={point.x} cy={point.y} r={0.08} fill={color}></circle>
            );
            // Translation
          } else {
            return <></>;
            // Empty
          }
        })}
      </>
    );
  }
}
export default observer(FieldSamples);
