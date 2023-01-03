import React, { Component} from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import DocumentManagerContext from "../../document/DocumentManager";
import {IHolonomicWaypointStore } from "../../document/DocumentModel";
import {observer} from "mobx-react"
import SidebarWaypoint from "./SidebarWaypoint";
import WaypointPanel from "./WaypointPanel";
import styles from './Sidebar.module.css';
import waypointStyles from './SidebarWaypoint.module.css';
import {faPlus} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import PathSelect from "../navbar/PathSelect";
import Drawer from '@mui/material/Drawer'

const getListStyle = (isDraggingOver : boolean) => ({
  background: isDraggingOver ? "lightblue" : "transparent",
  
});

type Props = {};
type State = {items: Array<SidebarWaypoint>};

class Sidebar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {
    items: new Array<SidebarWaypoint>(),
    selectedIndex:1
  }
  constructor(props: Props) {
    super(props);
    
    this.onDragEnd = this.onDragEnd.bind(this);
  }
  reorder ( startIndex: number, endIndex: number) {
    this.context.model.pathlist.activePath.reorder(startIndex, endIndex);
  };
  onDragEnd(result: any) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    this.reorder(
      result.source.index,
      result.destination.index
    );
  }

  newWaypoint(): void {
    this.context.model.pathlist.activePath.addWaypoint();   
  }
  componentDidMount(): void {
  }
  // Normally you would want to split things out into separate components.
  // But in this example everything is just done in one place for simplicity
  render() {

    let waypoints = this.context.model.pathlist.activePath.waypoints.map(
      (holonomicWaypoint: IHolonomicWaypointStore, index: number)=>
        new SidebarWaypoint({waypoint: holonomicWaypoint, index:index, context:this.context})
    );
    return (
      <div className={styles.Container}>
      <div className={styles.Sidebar}>
      <DragDropContext onDragEnd={this.onDragEnd}>

        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={styles.WaypointList}
              style={getListStyle(snapshot.isDraggingOver)}

            >
              {waypoints.map((item, index) => {

                return item.render();

              })}
              {provided.placeholder}
              <button onClick={()=>this.newWaypoint()} className={waypointStyles.Container}>
              <FontAwesomeIcon icon={faPlus}></FontAwesomeIcon>
              </button>
            </div>
            
            
          )}
          
        </Droppable>
        
      </DragDropContext>
      </div>
      {/* <WaypointPanel waypoint={this.context.model.pathlist.activePath.lowestSelectedPoint()}></WaypointPanel> */}
      </div>
    );
  }
}
export default observer(Sidebar);