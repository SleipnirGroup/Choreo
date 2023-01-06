import { observer } from 'mobx-react';
import React, { Component } from 'react'
import { Draggable, DraggingStyle, NotDraggingStyle } from 'react-beautiful-dnd';
import { CSSProperties } from 'styled-components';
import DocumentManagerContext from '../../document/DocumentManager';
import { IHolonomicWaypointStore } from '../../document/DocumentModel';
import styles from './SidebarWaypoint.module.css';

type Props = {
  waypoint: IHolonomicWaypointStore;
  index: number;
  context: React.ContextType<typeof DocumentManagerContext>
}

type State = { selected: boolean; }

class SidebarWaypoint extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  id: number = 0;
  state = { selected: false };

  getItemStyle(isDragging: boolean, draggableStyle: DraggingStyle | NotDraggingStyle | undefined): CSSProperties {
    return ({

      // change background colour if dragging
      //background: isDragging ? "lightgreen" : "revert",

      // styles we need to apply on draggables
      ...draggableStyle
    })
  };

  render() {
    let waypoint = this.props.waypoint
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes
    let selected = waypoint.selected;
    return (
      <Draggable key={waypoint.uuid} draggableId={waypoint.uuid} index={this.props.index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={styles.Container + (selected ? ` ${styles.selected}` : "")}

            style={this.getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
            onClick={() => { this.context.model.pathlist.activePath.selectOnly(this.props.index); }}
          >
            {this.props.index + 1}
          </div>)}
      </Draggable>
    )
  }
}
export default observer(SidebarWaypoint)