import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";

type Props = object;

type State = object;

class FieldSamples extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    const path = this.context.model.document.pathlist.activePath;
    return (
      <>
        {path.generatedWaypoints.map((point, idx) => {
          let color = "white";
          if (idx === 0) {
            color = "green";
          } else if (idx === path.generatedWaypoints.length - 1) {
            color = "red";
          }
          if (point.isInitialGuess) {
            return <></>; // Guess
          } else if (point.headingConstrained) {
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
          } else if (point.translationConstrained) {
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
