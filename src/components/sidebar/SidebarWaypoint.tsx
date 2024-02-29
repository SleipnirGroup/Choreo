import { observer } from "mobx-react";
import React, { Component } from "react";
import {
  Draggable,
  DraggingStyle,
  NotDraggingStyle
} from "react-beautiful-dnd";
import { CSSProperties } from "styled-components";
import DocumentManagerContext from "../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";
import styles from "./Sidebar.module.css";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import { isAlive } from "mobx-state-tree";
import { PriorityHigh } from "@mui/icons-material";
import { NavbarItemData } from "../../document/UIStateStore";

type Props = {
  waypoint: IHolonomicWaypointStore;
  index: number;
  pathLength: number;
  context: React.ContextType<typeof DocumentManagerContext>;
  issue: string | undefined;
};

type State = { selected: boolean };

class SidebarWaypoint extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  id: number = 0;
  state = { selected: false };

  getItemStyle(
    isDragging: boolean,
    draggableStyle: DraggingStyle | NotDraggingStyle | undefined
  ): CSSProperties {
    return {
      // change background colour if dragging
      //background: isDragging ? "lightgreen" : "revert",

      // styles we need to apply on draggables
      ...draggableStyle
    };
  }

  getIconColor(pathLength: number) {
    if (this.props.waypoint.selected) {
      return "var(--select-yellow)";
    }
    if (this.props.index == 0) {
      return "green";
    }
    if (this.props.index == pathLength - 1) {
      return "red";
    }
    return "var(--accent-purple)";
  }

  render() {
    const waypoint = this.props.waypoint;
    const pathLength = this.props.pathLength;
    const type = waypoint.type;
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes
    const { selected, _translationConstrained, _headingConstrained } = waypoint;
    if (!isAlive(waypoint)) return <></>;
    return (
      <Draggable
        key={waypoint.uuid}
        draggableId={waypoint.uuid}
        index={this.props.index}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={
              styles.SidebarItem + (selected ? ` ${styles.Selected}` : "")
            }
            style={this.getItemStyle(
              snapshot.isDragging,
              provided.draggableProps.style
            )}
            onClick={() => {
              this.context.model.uiState.setSelectedSidebarItem(waypoint);
              this.context.model.uiState.setSelectedNavbarItem(waypoint.type);
            }}
          >
            {React.cloneElement(NavbarItemData[type].icon, {
              className: styles.SidebarIcon,
              htmlColor: this.getIconColor(pathLength)
            })}
            {/* {translationConstrained && headingConstrained && (
              <Waypoint
                htmlColor={this.getIconColor(pathLength)}
                className={styles.SidebarIcon}
              ></Waypoint>
            )}
            {translationConstrained && !headingConstrained && (
              <Circle
                htmlColor={this.getIconColor(pathLength)}
                className={styles.SidebarIcon}
              ></Circle>
            )}
            {!translationConstrained && (
              <CircleOutlined
                htmlColor={this.getIconColor(pathLength)}
                className={styles.SidebarIcon}
              ></CircleOutlined>
            )} */}
            <span
              className={styles.SidebarLabel}
              style={{ display: "grid", gridTemplateColumns: "1fr auto auto" }}
            >
              {this.props.waypoint.typeName}
              {this.props.issue !== undefined &&
              this.props.issue.length! > 0 ? (
                <Tooltip disableInteractive title={this.props.issue}>
                  <PriorityHigh className={styles.SidebarIcon}></PriorityHigh>
                </Tooltip>
              ) : (
                <span></span>
              )}
              <span>{this.props.index + 1}</span>
            </span>
            <Tooltip disableInteractive title="Delete Waypoint">
              <IconButton
                className={styles.SidebarRightIcon}
                onClick={(e) => {
                  e.stopPropagation();
                  this.context.model.document.pathlist.activePath.deleteWaypointUUID(
                    waypoint?.uuid || ""
                  );
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </div>
        )}
      </Draggable>
    );
  }
}
export default observer(SidebarWaypoint);
