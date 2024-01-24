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
import {
  CommandType,
  CommandTypeNames,
  CommandUIData,
  ICommandStore,
} from "../../../document/EventMarkerStore";
import { IconButton, MenuItem, Select, TextField } from "@mui/material";
import { Add, Delete, DragHandle } from "@mui/icons-material";

type Props = {
  command: ICommandStore;
  index: number;
  parent?: ICommandStore;
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
    let commandsLength = this.props.command?.commands.length;
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes
    if (!isAlive(command)) return <></>;
    return (
      <div
        style={{
          backgroundColor: "var(--background-light-gray)",
          borderRadius: "8px",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          boxShadow: "2px 2px 1px black",
        }}
      >
        <span
          style={{
            display: "grid",
            gridTemplateColumns:
              "min-content auto min-content auto min-content min-content",
          }}
        >
          <DragHandle></DragHandle>
          {command.type === "named" && (
            <TextField
              label="Name"
              value={command.name}
              size="small"
              onChange={(e) => command.setName(e.target.value)}
            ></TextField>
          )}
          {command.type === "wait" && (
            <TextField
              label="Wait Time (s)"
              value={command.name}
              size="small"
              onChange={(e) => command.setName(e.target.value)}
            ></TextField>
          )}
          {command.isGroup() && CommandTypeNames[command.type].name}
          <Select
            size="small"
            variant="standard"
            value={command.type}
            onChange={(e) => command.setType(e.target.value as CommandType)}
            renderValue={(selected) => {
              return <></>;
            }}
          >
            {CommandUIData.map((data) => (
              <MenuItem value={data.id}>{data.name}</MenuItem>
            ))}
          </Select>
          <span></span>
          {command.isGroup() ? (
            <IconButton
              onClick={() => this.props.command.addSubCommand()}
              size="small"
            >
              <Add fontSize="small"></Add>
            </IconButton>
          ) : (
            <span></span>
          )}

          <IconButton
            size="small"
            onClick={() => {
              this.props.parent?.deleteSubCommand(command.uuid);
            }}
          >
            <Delete fontSize="small"></Delete>
          </IconButton>
        </span>
        {command.isGroup() && (
          <Droppable droppableId={command.uuid}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                style={{
                  backgroundColor: snapshot.isDraggingOver
                    ? "blue"
                    : "var(--background-dark-gray)",
                  borderRadius: "8px",
                  paddingLeft: "8px",
                  padding: "8px",
                  minHeight: "32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
                {...provided.droppableProps}
              >
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
                          parent={command}
                          context={this.props.context}
                          isDraggable={true}
                        ></CommandDraggable>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
    );
  }
}
export default observer(CommandDraggable);
