import { Component } from "react";
import { doc } from "../../../document/DocumentManager";

import { observer } from "mobx-react";

type Props = object;

type State = object;

class FieldConstraintsAddLayer extends Component<Props, State> {
  state = {};

  render() {
    const activePath = doc.pathlist.activePath;
    const waypoints = activePath.params.waypoints;
    return (
      <>
        {/* Draw circles on each waypoint */}
        {waypoints.map((point, index) => {
          return (
            <circle
              key={index}
              cx={point.x.value}
              cy={point.y.value}
              r={0.2}
              fill={"black"}
              fillOpacity={0.2}
              stroke="white"
              strokeWidth={0.05}
              onClick={() => {
                const newMarker = activePath.trajectory.addEventMarker();

                newMarker.setTarget({ uuid: point.uuid });
                // TODO Directly set target index if trajectory not stale
                doc.setSelectedSidebarItem(newMarker);
              }}
            ></circle>
          );
        })}
      </>
    );
  }
}
export default observer(FieldConstraintsAddLayer);
