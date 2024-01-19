import { observer } from "mobx-react";
import React, { Component } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import DocumentManagerContext from "../../../document/DocumentManager";
import styles from "../WaypointConfigPanel.module.css";
import InputList from "../../input/InputList";
import Input from "../../input/Input";
import ScopeSlider from "../ScopeSlider";
import { IEventMarkerStore } from "../../../document/EventMarkerStore";
import { toJS } from "mobx";
import CommandDraggable from "./CommandDraggable";

type Props = { marker: IEventMarkerStore };

type State = {};

class ConstraintsConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

    onDragEnd(result: any) {
      // dropped outside the list
      if (!result.destination) {
        return;
      }
      //this.reorder(result.source.index, result.destination.index);
    }
  render() {
    let marker = this.props.marker;

    let startIndex = (marker.getTargetIndex() ?? 0) + 1;
    let points = marker.getPath().waypoints;
    let pointcount = points.length;
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
          width: `min(80%, max(300px, calc(${pointcount} * 3ch + 8ch)))`,
        }}
      >
        <ScopeSlider
          isRange={false}
          startIndex={startIndex}
          endIndex={startIndex}
          setRange={(selection) => {
            const lastIdx = pointcount + 1;
            let idx = selection[0];
            if (idx == 0) {
              marker.setTarget("first");
            } else if (idx == lastIdx) {
              marker.setTarget("last");
            } else {
              marker.setTarget({
                uuid: points[idx - 1]?.uuid ?? "",
              });
            }
          }}
          points={points}
        ></ScopeSlider>

        <InputList>
          <Input
            key={"offset"}
            title={"Offset"}
            suffix={"s"}
            enabled={true}
            setEnabled={(a) => null}
            //@ts-ignore
            number={this.props.marker.offset}
            //@ts-ignore
            setNumber={(offset) => this.props.marker.setOffset(offset)}
            showCheckbox={false}
            titleTooltip={
              "The marker's time offset before or after this waypoint"
            }
          />
        </InputList>
        <DragDropContext onDragEnd={(result)=>this.onDragEnd(result)}>
          <CommandDraggable
            command={marker.command}
            index={0}
            context={this.context}
            isDraggable={false}
          ></CommandDraggable>
        </DragDropContext>
        {JSON.stringify(toJS(marker))}
      </div>
    );
  }
}
export default observer(ConstraintsConfigPanel);
