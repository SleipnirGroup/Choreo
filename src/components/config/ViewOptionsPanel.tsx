import { AspectRatio, Close, Gradient, Visibility } from "@mui/icons-material";
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
      <div className={styles.ViewOptionsPanel}>
        <Tooltip disableInteractive title="Zoom to fit trajectory">
          {/* If there's no waypoints, then don't allow user to zoom to fit Waypoints */}
          <IconButton
            disabled={doc.pathlist.activePath.path.waypoints.length == 0}
            onClick={() => doc.zoomToFitWaypoints()}
          >
            <AspectRatio></AspectRatio>
          </IconButton>
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
        <IconButton
          onClick={() => {
            uiState.setViewOptionsPanelOpen(!uiState.isViewOptionsPanelOpen);
          }}
        >
          {uiState.isViewOptionsPanelOpen ? <Close /> : <Visibility />}
        </IconButton>
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
              onChange={(e, newSelection) => {
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
      </div>
    );
  }
}
export default observer(ViewOptionsPanel);
