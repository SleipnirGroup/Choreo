import React, { Component } from "react";
import { IConstraintDataStore } from "../../../../document/ConstraintDataStore";
import {
  ConstraintKey,
  DataMap
} from "../../../../document/ConstraintDefinitions";
import { IHolonomicWaypointStore } from "../../../../document/HolonomicWaypointStore";
import * as d3 from "d3";
import { observer } from "mobx-react";
import { doc, uiState } from "../../../../document/DocumentManager";
import { ViewLayers } from "../../../../document/UIData";

const STROKE = 0.02;
const DOT = 0.1;

type Props<K extends ConstraintKey> = {
  data: IConstraintDataStore<K>;
  start?: IHolonomicWaypointStore;
  end?: IHolonomicWaypointStore;
  selected: boolean;
};
class KeepInLaneOverlay extends Component<Props<"KeepInLane">, object> {
  id = crypto.randomUUID();
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();
  componentDidMount() {
    if (this.rootRef.current) {
      const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTolerance(event))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInLaneAbove` + this.id
      ).call(dragHandleDrag);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInLaneBelow` + this.id
      ).call(dragHandleDrag);
    }
  }
  dragPointTolerance(event: DragEvent) {
    const data = this.props.data;
    const { x, y } = event;
    const start = this.props.start;
    const end = this.props.end;
    if (start === undefined || end === undefined || start.uuid === end.uuid) {
      return;
    }
    const startX = start.x.value;
    const startY = start.y.value;
    const endX = end.x.value;
    const endY = end.y.value;
    // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line#Line_defined_by_two_points
    const dx = endX - startX;
    const dy = endY - startY;
    const dist =
      Math.abs(dy * x - dx * y + endX * startY - endY * startX) /
      Math.hypot(dx, dy);
    data.tolerance.set(dist);
  }
  render() {
    const data = this.props.data.serialize as DataMap["KeepInLane"];
    const tolerance = data.props.tolerance.val + STROKE / 2;
    const start = this.props.start;
    const end = this.props.end;
    if (start === undefined || end === undefined || start.uuid === end.uuid) {
      return <></>;
    }
    const startX = start.x.value;
    const startY = start.y.value;
    const endX = end.x.value;
    const endY = end.y.value;

    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.hypot(dy, dx);
    if (dist === 0) {
      return <></>;
    }
    const [offsetX, offsetY] = [
      -tolerance * (dy / dist),
      tolerance * (dx / dist)
    ];
    const [startAboveX, startAboveY] = [startX + offsetX, startY + offsetY];
    const [endAboveX, endAboveY] = [endX + offsetX, endY + offsetY];
    const [midAboveX, midAboveY] = [
      (endAboveX + startAboveX) / 2,
      (endAboveY + startAboveY) / 2
    ];
    const [startBelowX, startBelowY] = [startX - offsetX, startY - offsetY];
    const [endBelowX, endBelowY] = [endX - offsetX, endY - offsetY];
    const [midBelowX, midBelowY] = [
      (endBelowX + startBelowX) / 2,
      (endBelowY + startBelowY) / 2
    ];
    const color =
      uiState.layers[ViewLayers.Waypoints] &&
      uiState.isNavbarWaypointSelected() &&
      !this.props.selected
        ? "darkseagreen"
        : "green";
    return (
      <g ref={this.rootRef}>
        {/* Lines */}

        <line
          x1={startAboveX}
          x2={endAboveX}
          y1={startAboveY}
          y2={endAboveY}
          stroke={color}
          strokeWidth={STROKE}
          strokeOpacity={1.0}
          id="line-keepInLaneAbove"
        ></line>
        <line
          x1={startBelowX}
          x2={endBelowX}
          y1={startBelowY}
          y2={endBelowY}
          stroke={color}
          strokeWidth={STROKE}
          strokeOpacity={1.0}
          id="line-keepInLaneBelow"
        ></line>
        <circle
          cx={midAboveX}
          cy={midAboveY}
          r={DOT}
          fill={color}
          fillOpacity={1.0}
          pointerEvents={"visible"}
          id={"dragTarget-keepInLaneAbove" + this.id}
        ></circle>
        <circle
          cx={midBelowX}
          cy={midBelowY}
          r={DOT}
          fill={color}
          fillOpacity={1.0}
          pointerEvents={"visible"}
          id={"dragTarget-keepInLaneBelow" + this.id}
        ></circle>
      </g>
    );
  }
}
export default observer(KeepInLaneOverlay);
