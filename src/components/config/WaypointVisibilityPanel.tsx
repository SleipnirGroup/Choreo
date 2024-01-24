import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import { Slider } from "@mui/material";

type Props = {};

type State = {};

class WaypointVisibilityPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let startIndex =
      this.context.model.document.pathlist.activePath
        .visibleWaypointsRange[0] ?? 0;
    let endIndex =
      this.context.model.document.pathlist.activePath
        .visibleWaypointsRange[1] ?? 0;
    let points = this.context.model.document.pathlist.activePath.waypoints;
    let pointcount = points.length;

    const sliderMarks = [
      { value: 0, label: "Start" },
      ...points.flatMap((point, idx) => {
        if (point.isInitialGuess) {
          return [];
        } else {
          if (idx == pointcount - 2) {
            return { value: idx + 1, label: "End" };
          }
          return { value: idx + 1, label: idx + 1 };
        }
      }),
    ];
    if (this.context.model.document.pathlist.activePath.waypoints.length >= 2) {
      return (
        <div
          className={styles.WaypointVisibilityPanel}
          style={{
            width: `min(80%, max(300px, calc(${pointcount} * 3ch + 8ch)))`,
          }}
        >
          <div style={{ marginInline: "4ch" }}>
            {" "}
            <Slider
              sx={{
                '& .MuiSlider-markLabel[data-index="0"]': {
                  transform: "translateX(-3.5ch)",
                },
                [`& .MuiSlider-markLabel[data-index="${pointcount + 1}"]`]: {
                  transform: "translateX(0ch)",
                },
              }}
              step={null}
              min={0}
              max={pointcount - 1}
              value={[startIndex, endIndex]}
              marks={sliderMarks}
              track={"normal"}
              onChange={(e, value: number | number[], activeThumb: number) => {
                this.context.model.document.pathlist.activePath.setVisibleWaypoints(
                  value as number[]
                );
              }}
            ></Slider>
          </div>
        </div>
      );
    }
  }
}
export default observer(WaypointVisibilityPanel);
