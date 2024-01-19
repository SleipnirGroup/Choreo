import { observer } from "mobx-react";
import React, { Component } from "react";
import {
    Draggable,
    DraggingStyle,
    NotDraggingStyle,
    Droppable,
} from "react-beautiful-dnd";
import { CSSProperties } from "styled-components";
import DocumentManagerContext from "../../../document/DocumentManager";
import { isAlive } from "mobx-state-tree";
import { ICommandStore } from "../../../document/EventMarkerStore";

type Props = {
  command: ICommandStore;
  index: number;
  context: React.ContextType<typeof DocumentManagerContext>;
  isDraggable: boolean;
};

type State = { selected: boolean };

class CommandDraggable extends Component<Props, State> {
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

  render() {
    let command = this.props.command;
    let type = command.type;
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes
    if (!isAlive(command)) return <></>;
    return (
      <>
        {command.isGroup() && (
          <Droppable droppableId={command.uuid}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                style={{
                  backgroundColor: snapshot.isDraggingOver ? "blue" : "grey",
                  border:"1px solid red",
                  paddingLeft:"8px"
                }}
                {...provided.droppableProps}
              >
                <h2>{command.type}</h2>
                {command.commands.map((c, idx) => (
                  <Draggable key={c.uuid} draggableId={c.uuid} index={idx}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={this.getItemStyle(
                          snapshot.isDragging,
                          provided.draggableProps.style
                        )}
                      >
                        <CommandDraggable
                          command={c}
                          index={idx}
                          context={this.props.context}
                          isDraggable={true}
                        ></CommandDraggable>
                      </div>
                    )}
                

                  </Draggable>
                ))}
              </div>
            )}
          </Droppable>
        )}
      </>
    );
  }
}
export default observer(CommandDraggable);
