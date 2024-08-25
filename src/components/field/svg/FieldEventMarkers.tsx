import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../../document/DocumentManager";

import { sample } from "../../../util/MathUtil";

type MarkerProps = {
  x: number;
  y: number;
  selected: boolean;
  onSelect: () => void;
};

type MarkerState = object;

type Props = object;
type State = object;
class FieldEventMarker extends Component<MarkerProps, MarkerState> {
  render() {
    return (
      <g
        transform={`translate(${this.props.x}, ${this.props.y}) scale(${
          0.5 / 24
        }, ${-0.5 / 24})`}
      >
        <g transform={`translate(-12, -22)`}>
          <path d="M0 0h24v24H0z" fill="none" />
          <path
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            stroke="black"
            strokeWidth={1}
            fill={
              this.props.selected
                ? "var(--select-yellow)"
                : "var(--darker-purple)"
            }
            pointerEvents="visible"
            onClick={(e) => this.props.onSelect()}
          />
        </g>
      </g>
    );
  }
}

class FieldEventMarkers extends Component<Props, State> {
  state = {};

  render() {
    const path = doc.pathlist.activePath;
    return path.traj.markers.flatMap((marker) => {
      if (marker.timestamp === undefined) {
        return [];
      }
      const marked = sample(marker.timestamp, path.traj.fullTraj);
      return (
        <FieldEventMarker
          x={marked.x}
          y={marked.y}
          selected={marker.selected}
          onSelect={() => doc.setSelectedSidebarItem(marker)}
        ></FieldEventMarker>
      );
    });
  }
}
export default observer(FieldEventMarkers);
