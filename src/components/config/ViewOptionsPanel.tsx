import {
  AspectRatio,
  Close,
  Functions,
  Gradient,
  Visibility
} from "@mui/icons-material";
import {
  IconButton,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from "@mui/material";
import { observer } from "mobx-react";
import React, { Component } from "react";
import { doc, uiState } from "../../document/DocumentManager";
import { ViewItemData } from "../../document/UIData";
import styles from "./WaypointConfigPanel.module.css";
import { PathGradients } from "./robotconfig/PathGradient";
import ExpressionsConfigPanel from "./variables/ExpressionsConfigPanel";

type Props = object;

type State = {
  selectedElement: null | HTMLElement;
  isOpen: boolean;
};

class ViewOptionsPanel extends Component<Props, State> {
  state = {
    selectedElement: null,
    isOpen: false
  };

  handleOpenPathGradientMenu(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    this.setState({
      isOpen: !this.state.isOpen,
      selectedElement: event.currentTarget
    });
  }

  handleClosePathGradientMenu(
    selectedPathGradient: string,
    event: React.MouseEvent<HTMLLIElement, MouseEvent>
  ) {
    event.stopPropagation();
    uiState.setSelectedPathGradient(
      PathGradients[selectedPathGradient as keyof typeof PathGradients]
    );
    this.setState({ isOpen: false, selectedElement: null });
  }

  render() {
    return (
      <div
        className={styles.ViewOptionsPanel}
        style={{
          borderLeft: uiState.variablesPanelOpen ? "solid gray 1px" : "none"
        }}
      >
        <Tooltip disableInteractive title="Zoom to fit trajectory">
          <span>
            {/* If there's no waypoints, then don't allow user to zoom to fit Waypoints */}
            <IconButton
              disabled={doc.pathlist.activePath.params.waypoints.length == 0}
              onClick={() => doc.zoomToFitWaypoints()}
            >
              <AspectRatio></AspectRatio>
            </IconButton>
          </span>
        </Tooltip>
        <div>
          <Tooltip
            disableInteractive
            disableHoverListener={this.state.isOpen}
            title="Path Gradients"
          >
            <IconButton onClick={this.handleOpenPathGradientMenu.bind(this)}>
              <Gradient />
              <Menu
                id="basic-menu"
                anchorEl={this.state.selectedElement}
                open={this.state.isOpen}
                MenuListProps={{
                  "aria-labelledby": "basic-button"
                }}
              >
                {Object.keys(PathGradients).map((key) => (
                  <Tooltip
                    disableInteractive
                    title={
                      PathGradients[key as keyof typeof PathGradients]
                        .description
                    }
                    key={key}
                  >
                    <MenuItem
                      value={key}
                      selected={uiState.selectedPathGradient === key}
                      onClick={(event) =>
                        this.handleClosePathGradientMenu(key, event)
                      }
                    >
                      {
                        PathGradients[key as keyof typeof PathGradients]
                          .localizedDescription
                      }
                    </MenuItem>
                  </Tooltip>
                ))}
              </Menu>
            </IconButton>
          </Tooltip>
        </div>
        <div>
          <Tooltip disableInteractive title={"Variables"}>
            <IconButton
              onClick={() => {
                uiState.setVariablesPanelOpen(!uiState.variablesPanelOpen);
              }}
            >
              {uiState.variablesPanelOpen ? <Close /> : <Functions />}
            </IconButton>
          </Tooltip>
        </div>
        <Tooltip disableInteractive title={"View Layers"}>
          <IconButton
            onClick={() => {
              uiState.setViewOptionsPanelOpen(!uiState.isViewOptionsPanelOpen);
            }}
          >
            {uiState.isViewOptionsPanelOpen ? <Close /> : <Visibility />}
          </IconButton>
        </Tooltip>
        {uiState.isViewOptionsPanelOpen && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingTop: "8px"
            }}
          >
            <ToggleButtonGroup
              orientation="vertical"
              className={styles.ToggleGroup}
              value={uiState.visibleLayersOnly().map((i: number) => `${i}`)}
              onChange={(_e, newSelection) => {
                uiState.setVisibleLayers(
                  newSelection.map((i: string) => Number.parseInt(i) ?? -1)
                );
              }}
            >
              {ViewItemData.map((item, index) => (
                <Tooltip
                  disableInteractive
                  title={item.name}
                  placement="left"
                  key={index}
                  //@ts-expect-error We need the value for the toggle group
                  value={`${index}`}
                >
                  <ToggleButton
                    value={`${index}`}
                    sx={{
                      color: "var(--accent-purple)",
                      "&.Mui-selected": {
                        color: "var(--select-yellow)"
                      }
                    }}
                  >
                    {item.icon}
                  </ToggleButton>
                </Tooltip>
              ))}
            </ToggleButtonGroup>
          </div>
        )}

        {uiState.variablesPanelOpen && (
          <div
            style={{
              overflowY: "scroll",
              position: "absolute",
              top: "0",
              right: "105%",
              background: "var(--background-light-gray)",
              color: "white",
              width: "min-content",
              padding: "8px",

              borderBottomLeftRadius: "10px",
              borderBottomRightRadius: "10px",

              display: "flex",
              flexDirection: "column"
            }}
          >
            <ExpressionsConfigPanel></ExpressionsConfigPanel>
          </div>
        )}
      </div>
    );
  }
}
export default observer(ViewOptionsPanel);
