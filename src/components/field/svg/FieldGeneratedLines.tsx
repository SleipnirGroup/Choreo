import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";
import { SavedTrajectorySample } from "../../../document/DocumentSpecTypes";
import { PathGradient, PathGradients } from "../../config/robotconfig/PathGradient";
import LocalStorageKeys from "../../../util/LocalStorageKeys";

type Props = object;

type State = {
  selectedPathGradient: PathGradient;
};

class FieldPathLines extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {
    selectedPathGradient: PathGradients.Velocity
  };

  render() {
    let generatedPathString = "";
    let generated = this.context.model.document.pathlist.activePath.generated;
    this.context.model.document.pathlist.activePath.generated.forEach(
      (point) => {
        generatedPathString += `${point.x},${point.y} `;
      }
    );

    const pathGradientLocalStorage = localStorage.getItem(LocalStorageKeys.PATH_GRADIENT);
    if (pathGradientLocalStorage) {
      this.state.selectedPathGradient = PathGradients[pathGradientLocalStorage as keyof typeof PathGradients];
    }

    return (
      <>
        {this.state.selectedPathGradient == PathGradients.None && <polyline
          points={generatedPathString}
          stroke="var(--select-yellow)"
          strokeWidth={0.05}
          fill="transparent"
          style={{ pointerEvents: "none" }}
        ></polyline>}
        <g>
          {generated.map(
            (point, i, arr) => {
              if (i == arr.length - 1) { return (<></>) }
              var point2 = arr[i + 1];
              // 0 t = red, 1 t = green
              return (
                <line x1={point.x} y1={point.y} x2={point2.x} y2={point2.y}
                  strokeWidth={0.05} stroke={this.state.selectedPathGradient.function(point, i, arr)}></line>
              )
            })}
        </g>
      </>
    );
  }
}
export default observer(FieldPathLines);
