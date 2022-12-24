import React, { Component } from 'react'
import { Draggable, DraggingStyle, NotDraggingStyle } from 'react-beautiful-dnd';
import { CSSProperties } from 'styled-components';
import DocumentManagerContext from '../../document/DocumentManager';
import {IHolonomicWaypointStore } from '../../document/DocumentModel';
const styles = require('./SidebarWaypoint.module.css').default;

type Props = {
  waypoint: IHolonomicWaypointStore;
    index: number;
    context:React.ContextType<typeof DocumentManagerContext>
}

type State = {selected:boolean;}

export default class SidebarWaypoint extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
    id: number = 0;
  state = {selected: false};
    
    getItemStyle (isDragging: boolean, draggableStyle: DraggingStyle | NotDraggingStyle | undefined) : CSSProperties {return ({
  
    // change background colour if dragging
    //background: isDragging ? "lightgreen" : "revert",
  
    // styles we need to apply on draggables
    ...draggableStyle
  })};
  constructor(props:Props){
    super(props);
    this.context = this.props.context;
  }

  render() {
    console.log(this.context);
    console.log(this.props.waypoint.selected);
    return (
      <Draggable key={this.props.waypoint.uuid} draggableId={this.props.waypoint.uuid} index={this.props.index}>
        {(provided, snapshot)=>(
        <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className = {styles.Container  + (this.props.waypoint.selected ? ` ${styles.selected}` : "")}
            
            style={this.getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
            onClick={()=>{this.context.model.pathlist.activePath.selectOnly(this.props.index);}}
        >
                {this.props.index +1}
        </div>)}
    </Draggable>
    )
  }
}