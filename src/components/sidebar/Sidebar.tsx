import React, { Component} from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import HolonomicWaypoint from "../../datatypes/HolonomicWaypoint";
import DocumentManagerContext, { DocumentManager } from "../../document/DocumentManager";
import { HolonomicWaypointStore, IHolonomicWaypointStore } from "../../document/DocumentModel";
import {observer} from "mobx-react"
import SidebarWaypoint from "./SidebarWaypoint";
import WaypointPanel from "./WaypointPanel";
const styles = require('./Sidebar.module.css').default;
const waypointStyles = require('./SidebarWaypoint.module.css').default;

// a little function to help us with reordering the result



const getListStyle = (isDraggingOver : boolean) => ({
  background: isDraggingOver ? "lightblue" : "transparent",
  
});

type Props = {};
type State = {items: Array<SidebarWaypoint>, selectedIndex:number};

class Sidebar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {
    items: new Array<SidebarWaypoint>(),
    selectedIndex:1
  }
  constructor(props: Props) {
    super(props);
    console.log(this.context);
    
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
    console.log("adding waypoint")
    
  }
  componentDidMount(): void {
  }
  // Normally you would want to split things out into separate components.
  // But in this example everything is just done in one place for simplicity
  render() {

    let waypoints = this.context.model.pathlist.activePath.waypoints.map(
      (holonomicWaypoint: IHolonomicWaypointStore, index: number)=>
        new SidebarWaypoint({waypoint: holonomicWaypoint, index:index})
    );
    waypoints.forEach((item, index) => {
      item.state.selected = (index === this.state.selectedIndex);
    })
    console.log(this.state.selectedIndex);
    return (
      <div className={styles.Container}>
      <div className={styles.Sidebar}>
      <div>
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
                return <div onClick={()=>{this.setState({selectedIndex:index})}}>{item.render()}</div>;
              })}
              {provided.placeholder}
              <button onClick={()=>this.newWaypoint()} className={waypointStyles.Container}>+</button>
            </div>
            
            
          )}
          
        </Droppable>
        
      </DragDropContext>
      </div>
      <a href="https://discord.gg/JTHnsEC6sE">.</a>
      
      </div>
      <WaypointPanel waypoint={this.context.model.pathlist.activePath.waypoints[this.state.selectedIndex]}></WaypointPanel>
      </div>
    );
  }
}
export default observer(Sidebar);