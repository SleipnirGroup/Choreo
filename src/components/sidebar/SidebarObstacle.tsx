import { Component } from "react";
import React from "react";
import { ICircularObstacleStore } from "../../document/CircularObstacleStore";
import { doc, uiState } from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";
import { observer } from "mobx-react";
import DeleteIcon from "@mui/icons-material/Delete";
import { DoNotDisturb } from "@mui/icons-material";
import { Tooltip, IconButton } from "@mui/material";

type Props = {
  obstacle: ICircularObstacleStore;
  index: number;
};

type State = { selected: boolean };

class SidebarObstacle extends Component<Props, State> {
  id: number = 0;
  state = { selected: false };

  render() {
    const obstacle = this.props.obstacle;
    const selected = this.props.obstacle.selected;
    return (
      <div
        className={styles.SidebarItem + (selected ? ` ${styles.Selected}` : "")}
        onClick={() => {
          doc.setSelectedSidebarItem(obstacle);
          uiState.setSelectedNavbarItem(9);
        }}
      >
        {React.cloneElement(<DoNotDisturb></DoNotDisturb>, {
          className: styles.SidebarIcon,
          htmlColor: this.state.selected
            ? "var(--select-yellow)"
            : "var(--accent-purple)"
        })}
        <span
          className={styles.SidebarLabel}
          style={{ display: "grid", gridTemplateColumns: "1fr auto auto" }}
        >
          {"Obstacle " + (this.props.index + 1)}
        </span>
        <Tooltip disableInteractive title="Delete Obstacle">
          <IconButton
            className={styles.SidebarRightIcon}
            onClick={(e) => {
              e.stopPropagation();
              doc.pathlist.activePath.path.deleteObstacle(obstacle?.uuid || "");
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>
    );
  }
}
export default observer(SidebarObstacle);
