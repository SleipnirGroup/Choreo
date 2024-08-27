import { Add, Delete, DragHandle } from "@mui/icons-material";
import { IconButton, MenuItem, Select, TextField } from "@mui/material";
import { observer } from "mobx-react";
import { isAlive } from "mobx-state-tree";
import React, { CSSProperties, Component } from "react";
import {
  Draggable,
  DraggingStyle,
  Droppable,
  NotDraggingStyle
} from "react-beautiful-dnd";
import {
  CommandType,
  CommandUIData,
  ICommandStore
} from "../../../document/EventMarkerStore";
import ExpressionInput from "../../input/ExpressionInput";
import ExpressionInputList from "../../input/ExpressionInputList";

type Props = {
  command: ICommandStore;
  index: number;
  parent?: ICommandStore;
  isDraggable: boolean;
  isRoot?: boolean;
};

type State = { selected: boolean };

class CommandDraggable extends Component<Props, State> {
  id: number = 0;
  state = { selected: false };
  nameInputRef: React.RefObject<HTMLInputElement> =
    React.createRef<HTMLInputElement>();

  getItemStyle(
    isDragging: boolean,
    draggableStyle: DraggingStyle | NotDraggingStyle | undefined
  ): CSSProperties {
    return {
      // change background colour if dragging
      //background: isDragging ? "lightgreen" : "revert",
      margin: "4px",
      // styles we need to apply on draggables
      ...draggableStyle
    };
  }

  render() {
    const command = this.props.command;
    // commandsLength is dereferenced so that this rerenders when the length
    // of its subcommands array changes
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const commandsLength = this.props.command?.commands.length;
    const isRoot = this.props.isRoot ?? false;
    if (!isAlive(command)) return <></>;
    return (
      <div
        style={{
          backgroundColor: isRoot
            ? "var(--background-dark-gray)"
            : "var(--background-light-gray)",
          borderRadius: "8px",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxShadow: isRoot ? "none" : "2px 2px 1px black"
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "4px"
          }}
        >
          {!isRoot && <DragHandle></DragHandle>}
          <Select
            sx={{
              ".MuiInput-input": {
                paddingBottom: "0px"
              }
            }}
            size="small"
            variant="standard"
            value={command.type}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => command.setType(e.target.value as CommandType)}
          >
            {CommandUIData.map((data) => (
              <MenuItem key={data.id} value={data.id}>
                {data.name}
              </MenuItem>
            ))}
          </Select>
          {command.type === "named" && (
            <TextField
              inputRef={this.nameInputRef}
              sx={{
                marginLeft: "1ch",
                ".MuiInput-input": {
                  paddingBottom: "0px"
                }
              }}
              fullWidth
              variant="standard"
              placeholder="Name"
              value={command.name ?? ""}
              size="small"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => command.setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key == "Enter") {
                  this.nameInputRef.current?.blur();
                }
              }}
            ></TextField>
          )}
          {command.type === "wait" && (
            <ExpressionInputList style={{ flexGrow: 1 }}>
              <ExpressionInput
                title={""}
                enabled={true}
                number={command.time}
              ></ExpressionInput>
            </ExpressionInputList>
          )}
          {(command.isGroup() || !isRoot) && (
            <span style={{ flexGrow: 1 }}></span>
          )}
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
          {!isRoot && (
            <IconButton
              size="small"
              onClick={() => {
                this.props.parent?.deleteSubCommand(command.uuid);
              }}
            >
              <Delete fontSize="small"></Delete>
            </IconButton>
          )}
        </span>
        {command.isGroup() && (
          <Droppable type={command.uuid} droppableId={command.uuid}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                style={{
                  backgroundColor: snapshot.isDraggingOver
                    ? "var(--darker-purple)"
                    : "var(--background-dark-blue)",
                  borderRadius: "8px",
                  padding: "4px",
                  minHeight: "32px",
                  display: "flex",
                  flexDirection: "column"
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
                        onClick={(e) => {
                          if (!e?.defaultPrevented) {
                            e.currentTarget?.focus();
                            e.stopPropagation();
                          }
                        }}
                        style={this.getItemStyle(
                          snapshot.isDragging,
                          provided.draggableProps.style
                        )}
                      >
                        <CommandDraggable
                          command={c}
                          index={idx}
                          parent={command}
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
