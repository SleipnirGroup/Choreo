import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";
import { PathGradients } from "../../config/robotconfig/PathGradient";

type Props = object;

type State = object;

class FieldPathLines extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;

  render() {
    const path = this.context.model.document.pathlist.activePath;
    let generatedPathString = "";
    const trajectory = path.generating
      ? path.generationProgress
      : path.generated;
    // preserve the acccess of generationIterationNumber
    // to trigger rerenders when mutating the in-progress trajectory in place
    const _ = path.generationIterationNumber;
    trajectory.forEach((point) => {
      generatedPathString += `${point.x},${point.y} `;
    });
    const key = this.context.model.uiState
      .selectedPathGradient as keyof typeof PathGradients;
    const pathGradient = PathGradients[key];
    if (
      pathGradient === undefined ||
      this.context.model.uiState.selectedPathGradient == PathGradients.None.name
    ) {
      return (
        <polyline
          points={generatedPathString}
          stroke="var(--select-yellow)"
          strokeWidth={0.05}
          fill="transparent"
          style={{ pointerEvents: "none" }}
        ></polyline>
      );
    }
    return (
      <>
        <g>
          {trajectory.length > 1 &&
            trajectory.map((point, i, arr) => {
              if (i == arr.length - 1) {
                return <></>;
              }
              const point2 = arr[i + 1];

              // 0 t = red, 1 t = green
              return (
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={point2.x}
                  y2={point2.y}
                  strokeWidth={0.05}
                  stroke={pathGradient.function(
                    point,
                    i,
                    arr,
                    this.context.model
                  )}
                ></line>
              );
            })}
        </g>
      </>
    );
  }
}
export default observer(FieldPathLines);
