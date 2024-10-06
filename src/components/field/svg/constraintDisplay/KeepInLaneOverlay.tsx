import React, { Component } from "react";
import { IConstraintDataStore } from "../../../../document/ConstraintDataStore";
import {
  ConstraintKey,
  DataMap
} from "../../../../document/ConstraintDefinitions";
import { IHolonomicWaypointStore } from "../../../../document/HolonomicWaypointStore";
import * as d3 from "d3";
import { observer } from "mobx-react";
import { doc } from "../../../../document/DocumentManager";

const STROKE = 0.1;
const DOT = 0.1;

type Props<K extends ConstraintKey> = {
  data: IConstraintDataStore<K>;
  start?: IHolonomicWaypointStore;
  end?: IHolonomicWaypointStore;
};
class KeepInLaneOverlay extends Component<Props<"KeepInLane">, object> {
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();
  componentDidMount() {
    if (this.rootRef.current) {
      // Theres probably a better way to do this
      // TODO doesn't work :(
      const dragHandleDragAbove = d3
        .drag<SVGLineElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, false))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGLineElement, undefined>(`dragTarget-keepInLaneAbove`).call(
        dragHandleDragAbove
      );

      const dragHandleDragBelow = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, false))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(`dragTarget-keepInLaneBelow`).call(
        dragHandleDragBelow
      );

      const dragHandleDragBelowStart = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, false))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `dragTarget-keepInLaneBelowStart`
      ).call(dragHandleDragBelowStart);

      const dragHandleDragBelowEnd = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, false))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `dragTarget-keepInLaneBelowEnd`
      ).call(dragHandleDragBelowEnd);

      const dragHandleDragAboveStart = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, false))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `dragTarget-keepInLaneAboveStart`
      ).call(dragHandleDragAboveStart);

      const dragHandleDragAboveEnd = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, false))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `dragTarget-keepInLaneAboveEnd`
      ).call(dragHandleDragAboveEnd);
    }
  }

  dragPointTranslate(event: any, xOffset: boolean, yOffset: boolean) {
    const data = this.props.data;
    console.log(xOffset, yOffset);
    data.below_start_x.set(
      data.serialize.props.below_start_x.val +
        event.dBelowStartX * (xOffset ? 0.0 : 1.0)
    );
    data.below_start_y.set(
      data.serialize.props.below_start_y.val +
        event.dBelowStartY * (yOffset ? 0.0 : 1.0)
    );
    data.below_end_x.set(
      data.serialize.props.below_end_x.val +
        event.dBelowEndX * (xOffset ? 0.0 : 1.0)
    );
    data.below_end_y.set(
      data.serialize.props.below_end_y.val +
        event.dBelowEndY * (yOffset ? 0.0 : 1.0)
    );
    data.above_start_x.set(
      data.serialize.props.above_start_x.val +
        event.dAboveStartX * (xOffset ? 0.0 : 1.0)
    );
    data.above_start_y.set(
      data.serialize.props.above_start_y.val +
        event.dAboveStartY * (yOffset ? 0.0 : 1.0)
    );
    data.above_end_x.set(
      data.serialize.props.above_end_x.val +
        event.dAboveEndX * (xOffset ? 0.0 : 1.0)
    );
    data.above_end_y.set(
      data.serialize.props.above_end_y.val +
        event.dAboveEndY * (yOffset ? 0.0 : 1.0)
    );
  }

  render() {
    const data = this.props.data.serialize as DataMap["KeepInLane"];
    const belowStartX = data.props.below_start_x.val;
    const belowStartY = data.props.below_start_y.val;
    const belowEndX = data.props.below_end_x.val;
    const belowEndY = data.props.below_end_y.val;
    const aboveStartX = data.props.above_start_x.val;
    const aboveStartY = data.props.above_start_y.val;
    const aboveEndX = data.props.above_end_x.val;
    const aboveEndY = data.props.above_end_y.val;
    return (
      <g ref={this.rootRef}>
        {/* Lines */}
        <line
          x1={belowStartX}
          x2={belowEndX}
          y1={belowStartY}
          y2={belowEndY}
          stroke="green"
          strokeWidth={STROKE}
          strokeOpacity={1.0}
          id="dragTarget-keepInLaneBelow"
        ></line>
        <line
          x1={aboveStartX}
          x2={aboveEndX}
          y1={aboveStartY}
          y2={aboveEndY}
          stroke="green"
          strokeWidth={STROKE}
          strokeOpacity={1.0}
          id="dragTarget-keepInLaneAbove"
        ></line>
        {/* Points */}
        <circle
          cx={belowStartX}
          cy={belowStartY}
          r={DOT}
          fill={"green"}
          fillOpacity={1.0}
          id="dragTarget-keepInLaneBelowStart"
        ></circle>
        <circle
          cx={aboveStartX}
          cy={aboveStartY}
          r={DOT}
          fill={"green"}
          fillOpacity={1.0}
          id="dragTarget-keepInLaneAboveStart"
        ></circle>
        <circle
          cx={belowEndX}
          cy={belowEndY}
          r={DOT}
          fill={"green"}
          fillOpacity={1.0}
          id="dragTarget-keepInLaneBelowEnd"
        ></circle>
        <circle
          cx={aboveEndX}
          cy={aboveEndY}
          r={DOT}
          fill={"green"}
          fillOpacity={1.0}
          id="dragTarget-keepInLaneAboveEnd"
        ></circle>
      </g>
    );
  }
}
export default observer(KeepInLaneOverlay);
