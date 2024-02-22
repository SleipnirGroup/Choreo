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

  render() {
    let uiState = this.context.model.uiState;
    return (
      <div className={styles.VisibilityPanel}>
        <Tooltip disableInteractive title="Zoom to fit trajectory">
          <IconButton onClick={() => this.context.model.zoomToFitTrajectory()}>
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
