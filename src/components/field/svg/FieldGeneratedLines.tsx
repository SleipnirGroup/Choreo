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
    let generatedPathString = "";
    const generated = this.context.model.document.pathlist.activePath.generated;
    this.context.model.document.pathlist.activePath.generated.forEach(
      (point) => {
        generatedPathString += `${point.x},${point.y} `;
      }
    );
    const key = this.context.model.uiState.selectedPathGradient as keyof typeof PathGradients;
    const pathGradient = PathGradients[key];
    this.context.model.uiState.loadPathGradientFromLocalStorage();

    return (
      <>
        {this.context.model.uiState.selectedPathGradient ==
          PathGradients.None.name && (
          <polyline
            points={generatedPathString}
            stroke="var(--select-yellow)"
            strokeWidth={0.05}
            fill="transparent"
            style={{ pointerEvents: "none" }}
          ></polyline>
        )}
        <g>
          /
          {this.context.model.uiState.selectedPathGradient !=
            PathGradients.None.name &&
            generated.length > 1 &&
            generated.map((point, i, arr) => {
              if (i == arr.length - 1) {
                return <></>;
              }
              const point2 = arr[i + 1];

              if (!pathGradient) {
                return <></>;
              }

              // 0 t = red, 1 t = green
              return (
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={point2.x}
                  y2={point2.y}
                  strokeWidth={0.05}
                  stroke={pathGradient.function(point, i, arr)}
                ></line>
              );
            })}
        </g>
      </>
    );
  }
}
export default observer(FieldPathLines);
