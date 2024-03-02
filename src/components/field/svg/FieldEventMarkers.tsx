import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

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
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    const path = this.context.model.document.pathlist.activePath;
    return path.eventMarkers.flatMap((marker) => {
      if (marker.timestamp === undefined) {
        return [];
      }
      const marked = sample(marker.timestamp, path.generated);
      return (
        <FieldEventMarker
          x={marked.x}
          y={marked.y}
          selected={marker.selected}
          onSelect={() =>
            this.context.model.uiState.setSelectedSidebarItem(marker)
          }
        ></FieldEventMarker>
      );
    });
  }
}
export default observer(FieldEventMarkers);
