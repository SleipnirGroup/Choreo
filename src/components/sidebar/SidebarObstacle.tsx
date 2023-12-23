import { Component, CSSProperties } from "react";
import React from "react";
import { ICircularObstacleStore } from "../../document/CircularObstacleStore";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";
import {
  Draggable,
  DraggingStyle,
  NotDraggingStyle,
} from "react-beautiful-dnd";
import { observer } from "mobx-react";
import { NavbarItemData } from "../../document/UIStateStore";
import { red } from "@mui/material/colors";
import { Circle } from "@mui/icons-material";

type Props = {
    obstacle: ICircularObstacleStore;
    index: number;
    context: React.ContextType<typeof DocumentManagerContext>;
  };
  
  type State = { selected: boolean };
  
  class SidebarObstacle extends Component<Props, State> {
    static contextType = DocumentManagerContext;
    declare context: React.ContextType<typeof DocumentManagerContext>;
    id: number = 0;
    state = { selected: false };

    render() {
        let obstacle = this.props.obstacle;
        return (
            <div
                className={styles.SidebarItem + (this.state.selected ? ` ${styles.Selected}` : "")}
                onClick={() => {
                    this.context.model.uiState.setSelectedSidebarItem(obstacle);
                    this.context.model.uiState.setSelectedNavbarItem(9);
                  }}
            >
                {React.cloneElement(<Circle></Circle>, {
                    className: styles.SidebarIcon,
                    htmlColor: this.state.selected ? "var(--select-yellow)" : "var(--accent-purple)",
                })}
                <span
                    className={styles.SidebarLabel}
                    style={{ display: "grid", gridTemplateColumns: "1fr auto auto" }}
                >
                    {"Obstacle x: " + this.props.obstacle.x.toFixed(2) + ", y: " + this.props.obstacle.y.toFixed(2)}
                </span>
            </div>
        )
    }
}
export default observer(SidebarObstacle);