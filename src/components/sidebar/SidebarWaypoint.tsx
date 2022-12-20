import React, { Component } from 'react'
import { Draggable, DraggingStyle, NotDraggingStyle } from 'react-beautiful-dnd';
import { CSSProperties } from 'styled-components';
const styles = require('./SidebarWaypoint.module.css').default;

type Props = {
    name: string;
    index: number;
}

type State = {}

export default class SidebarWaypoint extends Component<Props, State> {
    id: number = 0;
  state = {}
  index: number = 0;
    
    getItemStyle (isDragging: boolean, draggableStyle: DraggingStyle | NotDraggingStyle | undefined) : CSSProperties {return ({
  
    // change background colour if dragging
    background: isDragging ? "lightgreen" : "grey",
  
    // styles we need to apply on draggables
    ...draggableStyle
  })};

  render() {
    return (
      <Draggable key={this.props.name} draggableId={this.props.name} index={this.index}>
        {(provided, snapshot)=>(
        <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className = {styles.Container}
            style={this.getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
        >
                {this.props.name}
        </div>)}
    </Draggable>
    )
  }
}