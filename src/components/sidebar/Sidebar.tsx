import React, { Component } from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import DocumentManagerContext from "../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../document/DocumentModel";
import { observer } from "mobx-react";
import SidebarWaypoint from "./SidebarWaypoint";
import styles from "./Sidebar.module.css";
import SidebarRobotConfig from "./SidebarRobotConfig";
import { Divider } from "@mui/material";

const getListStyle = (isDraggingOver: boolean) => ({
  background: isDraggingOver ? "lightblue" : "transparent",
});

type Props = {};
type State = {};

class Sidebar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  constructor(props: Props) {
    super(props);

    this.onDragEnd = this.onDragEnd.bind(this);
  }

  reorder(startIndex: number, endIndex: number) {
    this.context.model.pathlist.activePath.reorder(startIndex, endIndex);
  }

  onDragEnd(result: any) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }
    this.reorder(result.source.index, result.destination.index);
  }

  newWaypoint(): void {
    this.context.model.pathlist.activePath.addWaypoint();
  }
  // Normally you would want to split things out into separate components.
  // But in this example everything is just done in one place for simplicity
  render() {
    let waypoints = this.context.model.pathlist.activePath.waypoints.map(
      (holonomicWaypoint: IHolonomicWaypointStore, index: number) => (
        <SidebarWaypoint
          waypoint={holonomicWaypoint}
          index={index}
          context={this.context}
          key={holonomicWaypoint.uuid}
        ></SidebarWaypoint>
      )
    );
    return (
      <div className={styles.Container}>
        <div className={styles.Sidebar}>
        <SidebarRobotConfig context={this.context}></SidebarRobotConfig>
        <Divider flexItem></Divider>
          <DragDropContext onDragEnd={this.onDragEnd}>
            <Droppable droppableId="droppable">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={styles.WaypointList}
                  style={getListStyle(snapshot.isDraggingOver)}
                >
                  {waypoints}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <Divider flexItem></Divider>
        </div>
      </div>
    );
  }
}
export default observer(Sidebar);
