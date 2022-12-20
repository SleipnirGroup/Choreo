import React, { Component} from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import SidebarWaypoint from "./SidebarWaypoint";
const styles = require('./Sidebar.module.css').default;
const waypointStyles = require('./SidebarWaypoint.module.css').default;


// a little function to help us with reordering the result
const reorder = (list : Array<SidebarWaypoint>, startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const grid = 8;


const getListStyle = (isDraggingOver : boolean) => ({
  background: isDraggingOver ? "lightblue" : "transparent",
  padding: grid,
  width: '100%',
  "box-sizing": 'border-box'
});

type Props = {};
type State = {items: Array<SidebarWaypoint>};

export default class Sidebar extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      items: [
        new SidebarWaypoint({name:"test", index:0}),
        new SidebarWaypoint({name:"tes", index:1})
      ]
    };
    this.onDragEnd = this.onDragEnd.bind(this);
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
    let newIndex : number = this.state.items.length;
    let newPoint: SidebarWaypoint = new SidebarWaypoint({name:`Waypoint ${newIndex}`, index: newIndex})
    this.state.items.push(newPoint);
    this.setState({
      items: this.state.items
    });
    console.log("adding waypoint")
  }
  // Normally you would want to split things out into separate components.
  // But in this example everything is just done in one place for simplicity
  render() {
    return (
      <div className={styles.Sidebar}>
        <div>
      <DragDropContext onDragEnd={this.onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={getListStyle(snapshot.isDraggingOver)}

            >
              {this.state.items.map((item, index) => {
                item.setState({index: index});
                item.index = index;
                return item.render();
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        <button onClick={()=>this.newWaypoint()} className={waypointStyles.Container}>Add new...</button>
      </DragDropContext>
      
      </div>
      </div>
    );
  }
}