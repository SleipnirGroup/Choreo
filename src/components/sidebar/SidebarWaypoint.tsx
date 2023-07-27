import { observer } from "mobx-react";
import React, { Component } from "react";
import {
  Draggable,
  DraggingStyle,
  NotDraggingStyle,
} from "react-beautiful-dnd";
import { CSSProperties } from "styled-components";
import DocumentManagerContext from "../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../document/DocumentModel";
import styles from "./SidebarWaypoint.module.css";
import Circle from "@mui/icons-material/Circle";

type Props = {
  waypoint: IHolonomicWaypointStore;
  index: number;
  pathLength: number;
  context: React.ContextType<typeof DocumentManagerContext>;
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
      ...draggableStyle,
    };
  }

  getIconColor(pathLength: number) {
    console.log(pathLength);
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
    let waypoint = this.props.waypoint;
    let pathLength = this.props.pathLength;
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes
    let selected = waypoint.selected;
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
              styles.Container + (selected ? ` ${styles.selected}` : "")
            }
            style={this.getItemStyle(
              snapshot.isDragging,
              provided.draggableProps.style
            )}
            onClick={() => {
              this.context.model.uiState.setSelectedSidebarItem(
                this.context.model.pathlist.activePath.waypoints[
                  this.props.index
                ]
              );
            }}
          >
            <Circle
              htmlColor={this.getIconColor(pathLength)}
              className={styles.SidebarIcon}
            ></Circle>
            Waypoint {this.props.index + 1}
          </div>
        )}
      </Draggable>
    );
  }
}
export default observer(SidebarWaypoint);
