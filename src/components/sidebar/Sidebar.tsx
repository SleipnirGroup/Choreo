import React, { Component} from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import HolonomicWaypoint from "../../datatypes/HolonomicWaypoint";
import documentManager from "../../document/DocumentManager";
import SidebarWaypoint from "./SidebarWaypoint";
import WaypointPanel from "./WaypointPanel";
const styles = require('./Sidebar.module.css').default;
const waypointStyles = require('./SidebarWaypoint.module.css').default;


// a little function to help us with reordering the result
const reorder = (list : Array<SidebarWaypoint>, startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};


const getListStyle = (isDraggingOver : boolean) => ({
  background: isDraggingOver ? "lightblue" : "transparent",
  
});

type Props = {};
type State = {items: Array<SidebarWaypoint>, selectedIndex:number};

export default class Sidebar extends Component<Props, State> {
  state = {
    items: new Array<SidebarWaypoint>(),
    selectedIndex:1
  }
  constructor(props: Props) {
    super(props);

    
    this.onDragEnd = this.onDragEnd.bind(this);
  }

  onPathChange() {
    
    this.setState({
      items: documentManager.model.getActivePath().waypoints.map(
        (holonomicWaypoint: HolonomicWaypoint, index: number)=>
          new SidebarWaypoint({waypoint: holonomicWaypoint, index:index})
      )
    })
  }
  onDragEnd(result: any) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const items = reorder(
      this.state.items,
      result.source.index,
      result.destination.index
    );

    this.setState({
      items
    });
  }

  newWaypoint(): void {
    documentManager.model.getActivePath().addWaypoint();
    this.onPathChange();
    console.log("adding waypoint")
    
  }
  componentDidMount(): void {
    documentManager.model.setActivePath("one");
    this.onPathChange();
  }
  // Normally you would want to split things out into separate components.
  // But in this example everything is just done in one place for simplicity
  render() {
    this.state.items.forEach((item, index) => {
      item.index = index;
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
              {this.state.items.map((item, index) => {
                item.index = index;
                console.log(item.index);
                return item.render();
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
      <WaypointPanel waypoint={documentManager.model.getActivePath().waypoints[this.state.selectedIndex]}></WaypointPanel>
      </div>
    );
  }
}