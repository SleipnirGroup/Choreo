import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import { Slider } from "@mui/material";
import { ViewLayers } from "../../document/UIStateStore";

type Props = object;

type State = object;

class WaypointVisibilityPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    const layers = this.context.model.uiState.layers;

    const startIndex =
      this.context.model.document.pathlist.activePath.visibleWaypointsStart ??
      0;
    const endIndex =
      this.context.model.document.pathlist.activePath.visibleWaypointsEnd ?? 0;
    const points = this.context.model.document.pathlist.activePath.waypoints;
    const pointcount = points.length;

    const sliderMarks = points.map((point, idx) => ({
      value: idx,
      label: idx + 1
    }));

    if (this.context.model.document.pathlist.activePath.waypoints.length >= 2) {
      return (
        layers[ViewLayers.Focus] && (
          <div
            className={styles.WaypointVisibilityPanel}
            style={{
              width: `min(80%, max(300px, calc(${pointcount} * 3ch + 8ch)))`
            }}
          >
            <div style={{ marginInline: "4ch" }}>
              <Slider
                step={null}
                min={0}
                max={pointcount - 1}
                value={[startIndex, endIndex]}
                marks={sliderMarks}
                track={"normal"}
                onChange={(
                  e,
                  value: number | number[],
                  activeThumb: number
                ) => {
                  if (typeof value === "number") {
                    this.context.model.document.pathlist.activePath.setVisibleWaypointsStart(
                      value
                    );
                    this.context.model.document.pathlist.activePath.setVisibleWaypointsEnd(
                      value
                    );
                  } else {
                    this.context.model.document.pathlist.activePath.setVisibleWaypointsStart(
                      value[0]
                    );
                    this.context.model.document.pathlist.activePath.setVisibleWaypointsEnd(
                      value[1]
                    );
                  }
                }}
              ></Slider>
            </div>
          </div>
        )
      );
    }
  }
}
export default observer(WaypointVisibilityPanel);
