import { observer } from "mobx-react";
import React, { Component } from "react";
import { doc, uiState } from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import { Slider } from "@mui/material";
import { ViewLayers } from "../../document/UIData";

type Props = object;

type State = object;

class WaypointVisibilityPanel extends Component<Props, State> {
  state = {};
  render() {
    const layers = uiState.layers;

    const startIndex = doc.pathlist.activePath.ui.visibleWaypointsStart ?? 0;
    const endIndex = doc.pathlist.activePath.ui.visibleWaypointsEnd ?? 0;
    const points = doc.pathlist.activePath.path.waypoints;
    const pointcount = points.length;

    const sliderMarks = points.map((point, idx) => ({
      value: idx,
      label: idx + 1
    }));

    if (doc.pathlist.activePath.path.waypoints.length >= 2) {
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
                    doc.pathlist.activePath.ui.setVisibleWaypointsStart(value);
                    doc.pathlist.activePath.ui.setVisibleWaypointsEnd(value);
                  } else {
                    doc.pathlist.activePath.ui.setVisibleWaypointsStart(
                      value[0]
                    );
                    doc.pathlist.activePath.ui.setVisibleWaypointsEnd(value[1]);
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
