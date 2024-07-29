import React, { Component } from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import {doc, uiState} from "../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";
import { observer } from "mobx-react";
import SidebarWaypoint from "./SidebarWaypoint";
import styles from "./Sidebar.module.css";

const getListStyle = (isDraggingOver: boolean) => ({
  outline: isDraggingOver ? "2px solid var(--darker-purple)" : "transparent"
});

type Props = object;

type State = object;

class WaypointList extends Component<Props, State> {
  

  state = {};
  constructor(props: Props) {
    super(props);

    this.onDragEnd = this.onDragEnd.bind(this);
  }

  reorder(startIndex: number, endIndex: number) {
    doc.pathlist.activePath.reorder(
      startIndex,
      endIndex
    );
  }

  onDragEnd(result: any) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }
    this.reorder(result.source.index, result.destination.index);
  }

  newWaypoint(): void {
    doc.pathlist.activePath.addWaypoint();
  }
  // Normally you would want to split things out into separate components.
  // But in this example everything is just done in one place for simplicity
  render() {
    const waypoints = doc.pathlist.activePath.waypoints;
    const waypointsLength =
      doc.pathlist.activePath.waypoints.length;
    if (waypointsLength == 0) {
      return (
        <div className={styles.SidebarItem + " " + styles.Noninteractible}>
          <span></span>
          <span style={{ color: "gray", fontStyle: "italic" }}>
            No Waypoints
          </span>
        </div>
      );
    }
    const waypointElements = waypoints.map(
      (holonomicWaypoint: IHolonomicWaypointStore, index: number) => {
        let issue = "";
        if (holonomicWaypoint.isInitialGuess) {
          if (index == 0) {
            issue = "Cannot start with an initial guess point.";
          } else if (index == waypoints.length - 1) {
            issue = "Cannot end with an initial guess point.";
          }
        }
        if (holonomicWaypoint.type == 2) {
          if (index == 0) {
            issue = "Cannot start with an empty waypoint.";
          } else if (index == waypoints.length - 1) {
            issue = "Cannot end with an empty waypoint.";
          }
        }
        return (
          <SidebarWaypoint
            waypoint={holonomicWaypoint}
            index={index}
            issue={issue}
            pathLength={waypoints.length}
            key={holonomicWaypoint.uuid}
          ></SidebarWaypoint>
        );
      }
    );

    return (
      <DragDropContext onDragEnd={this.onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={styles.WaypointList}
              style={getListStyle(snapshot.isDraggingOver)}
            >
              {waypointElements}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  }
}
export default observer(WaypointList);
