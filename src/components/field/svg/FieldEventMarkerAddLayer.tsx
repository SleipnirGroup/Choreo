import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";

type Props = {};

type State = {};

class FieldConstraintsAddLayer extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    let activePath = this.context.model.document.pathlist.activePath;
    let waypoints = activePath.waypoints;
    return (
      <>
        {/* Draw circles on each waypoint */}
        {waypoints
          .filter((waypoint) => !waypoint.isInitialGuess)
          .map((point, index) => {
            return (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={0.2}
                fill={"black"}
                fillOpacity={0.2}
                stroke="white"
                strokeWidth={0.05}
                onClick={() => {
                  let newMarker = activePath.addEventMarker();

                  newMarker.setTarget({ uuid: point.uuid });
                  if (!activePath.isTrajectoryStale) {
                    newMarker.setTrajTargetIndex(index);
                  }
                  this.context.model.uiState.setSelectedSidebarItem(newMarker);
                }}
              ></circle>
            );
          })}
      </>
    );
  }
}
export default observer(FieldConstraintsAddLayer);
