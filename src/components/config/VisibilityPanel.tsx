import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import {
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import { ViewItemData } from "../../document/UIStateStore";
import { AspectRatio, Visibility } from "@mui/icons-material";
import { Close } from "@mui/icons-material";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";

type Props = {};
type State = {};

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  centerOnWaypoint(waypoint: IHolonomicWaypointStore) {
    let x = waypoint.x;
    let y = waypoint.y;
    console.log(`Centering on ${x}, ${y}`);
    window.dispatchEvent(new CustomEvent("center", { detail: { x, y } }));
  }

  // x, y, k are the center coordinates (x, y) and scale factor (k)
  callCenter(x: number, y: number, k: number) {
    window.dispatchEvent(new CustomEvent("center", { detail: { x, y, k } }));
  }

  centerOnTrajectory() {
    let waypoints = this.context.model.document.pathlist.activePath.waypoints;
    if (waypoints.length <= 0) {
      return;
    } else if (waypoints.length === 1) {
      this.callCenter(waypoints[0].x, waypoints[0].y, 1);
    } else {
      let xMin = Infinity;
      let xMax = -Infinity;
      let yMin = Infinity;
      let yMax = -Infinity;
      for (let waypoint of waypoints) {
        xMin = Math.min(xMin, waypoint.x);
        xMax = Math.max(xMax, waypoint.x);
        yMin = Math.min(yMin, waypoint.y);
        yMax = Math.max(yMax, waypoint.y);
      }
      let x = (xMin + xMax) / 2;
      let y = (yMin + yMax) / 2;
      let k = Math.min(
        1 / ((xMax - xMin) / 2),
        1 / ((yMax - yMin) / 2),
        1 / 2
      );
      this.callCenter(x, y, k);
    }
    // let x = trajectory.x;
    // let y = trajectory.y;
    // console.log(`Centering on ${x}, ${y}`);
    // window.dispatchEvent(new CustomEvent("center", { detail: { x, y } }));
  }

  render() {
    let uiState = this.context.model.uiState;
    return (
      <div className={styles.VisibilityPanel}>
        <Tooltip disableInteractive title="Zoom to fit trajectory">
          <IconButton onClick={() => this.centerOnTrajectory()}>
            <AspectRatio></AspectRatio>
          </IconButton>
        </Tooltip>
        <IconButton
          onClick={() => {
            uiState.setVisibilityPanelOpen(!uiState.visibilityPanelOpen);
          }}
        >
          {uiState.visibilityPanelOpen ? <Close /> : <Visibility />}
        </IconButton>
        {uiState.visibilityPanelOpen && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingTop: "8px",
            }}
          >
            <ToggleButtonGroup
              orientation="vertical"
              className={styles.ToggleGroup}
              value={uiState.visibleLayersOnly().map((i: number) => `${i}`)}
              onChange={(e, newSelection) => {
                uiState.setVisibleLayers(
                  newSelection.map((i: string) => Number.parseInt(i) ?? -1)
                );
              }}
            >
              {ViewItemData.map((item, index) => (
                // @ts-ignore
                <Tooltip
                  disableInteractive
                  title={item.name}
                  placement="left"
                  key={index}
                  value={`${index}`}
                >
                  <ToggleButton
                    value={`${index}`}
                    sx={{
                      color: "var(--accent-purple)",
                      "&.Mui-selected": {
                        color: "var(--select-yellow)",
                      },
                    }}
                  >
                    {item.icon}
                  </ToggleButton>
                </Tooltip>
              ))}
            </ToggleButtonGroup>
          </div>
        )}
      </div>
    );
  }
}
export default observer(RobotConfigPanel);
