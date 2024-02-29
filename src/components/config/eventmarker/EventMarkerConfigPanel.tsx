import { observer } from "mobx-react";
import React, { Component } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import DocumentManagerContext from "../../../document/DocumentManager";
import styles from "../WaypointConfigPanel.module.css";
import InputList from "../../input/InputList";
import Input from "../../input/Input";
import ScopeSlider from "../ScopeSlider";
import {
  CommandStore,
  IEventMarkerStore
} from "../../../document/EventMarkerStore";
import { toJS } from "mobx";
import CommandDraggable from "./CommandDraggable";
import { resolveIdentifier } from "mobx-state-tree";
import { TextField, Tooltip } from "@mui/material";
import InputStyles from "../../input/InputList.module.css";

type Props = { marker: IEventMarkerStore };

type State = object;

class EventMarkerConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  nameInputRef: React.RefObject<HTMLInputElement> =
    React.createRef<HTMLInputElement>();
  state = {};

  onDragEnd(result: any) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }
    const sourceCommandList = result.source?.droppableId;
    const targetCommandList = result.destination?.droppableId;
    if (targetCommandList === null) return;
    const targetCommand = resolveIdentifier(
      CommandStore,
      this.props.marker,
      targetCommandList
    );
    if (targetCommand === undefined) {
      return;
    }
    console.log(targetCommand);
    console.log(toJS(this.props.marker));
    if (targetCommand === undefined) {
      return;
    }
    if (sourceCommandList === targetCommandList) {
      targetCommand.reorder(result.source.index, result.destination.index);
    } else {
      // This section is dead code until we have a DnD library that allows dragging
      // between layers of nested drop areas
      const sourceCommand = resolveIdentifier(
        CommandStore,
        this.props.marker,
        sourceCommandList
      );
      if (sourceCommand === undefined) {
        return;
      }
      targetCommand.pushCommand(
        sourceCommand.detachCommand(result.source.index)
      );
      targetCommand.reorder(
        targetCommand.commands.length - 1,
        result.destination.index
      );
    }
  }
  render() {
    const marker = this.props.marker;

    let startIndex = (marker.getTargetIndex() ?? -0.5) + 1;
    const points = marker.getPath().waypoints;
    const pointcount = points.length;
    if (marker.target === "first") {
      startIndex = 0;
    }
    if (marker.target === "last") {
      startIndex = pointcount + 1;
    }

    return (
      <div
        className={styles.WaypointPanel}
        style={{
          width: `min(80%, max(400px, calc(${pointcount} * 3ch + 8ch)))`,
          display: "flex",
          gap: "4px"
        }}
      >
        <ScopeSlider
          isRange={false}
          startIndex={startIndex}
          endIndex={startIndex}
          setRange={(selection) => {
            const lastIdx = pointcount + 1;
            const idx = selection[0];
            if (idx == 0) {
              marker.setTarget("first");
            } else if (idx == lastIdx) {
              marker.setTarget("last");
            } else {
              marker.setTarget({
                uuid: points[idx - 1]?.uuid ?? ""
              });
            }
          }}
          sliderProps={{
            color: marker.getTargetIndex() === undefined ? "error" : "primary"
          }}
          points={points}
        ></ScopeSlider>
        <span style={{ width: "100%", fontSize: "0.8em", opacity: 0.8 }}>
          Changes to waypoint target will not take effect until regeneration.
        </span>
        <InputList noCheckbox>
          <Tooltip
            disableInteractive
            title="Name of the marker (not the command)"
          >
            <span className={InputStyles.Title + " " + InputStyles.Tooltip}>
              Name
            </span>
          </Tooltip>

          <TextField
            inputRef={this.nameInputRef}
            value={marker.name}
            onChange={(e) => marker.setName(e.target.value)}
            variant="standard"
            size="small"
            placeholder="Marker Name"
            sx={{
              ".MuiInput-input": {
                paddingBottom: "0px"
              }
            }}
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                this.nameInputRef.current?.blur();
              }
            }}
          ></TextField>
          <span></span>
          <span></span>
          <Input
            key={"offset"}
            title={"Offset"}
            suffix={"s"}
            enabled={true}
            setEnabled={(a) => null}
            number={this.props.marker.offset}
            setNumber={(offset) => this.props.marker.setOffset(offset)}
            showCheckbox={false}
            titleTooltip={
              "The marker's time offset before or after this waypoint"
            }
          />
        </InputList>
        <DragDropContext onDragEnd={(result) => this.onDragEnd(result)}>
          <CommandDraggable
            command={marker.command}
            index={0}
            context={this.context}
            isDraggable={false}
            isRoot
          ></CommandDraggable>
        </DragDropContext>
      </div>
    );
  }
}
export default observer(EventMarkerConfigPanel);
