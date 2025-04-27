import * as d3 from "d3";
import { observer } from "mobx-react";
import React, { Component } from "react";
import { IConstraintDataStore } from "../../../../document/ConstraintDataStore";
import {
  ConstraintKey,
  DataMap
} from "../../../../document/ConstraintDefinitions";
import { doc, uiState } from "../../../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../../../document/HolonomicWaypointStore";
import { ViewLayers } from "../../../../document/UIData";
import { OverlayElementProps } from "./FieldConstraintDisplayLayer";

const STROKE = 0.1;
const DOT = 0.1;
const SELECT_COLOR = "var(--select-yellow)";
const MOVABLE_COLOR = "green";
const IMMOVABLE_COLOR = "darkseagreen";

class KeepInCircleOverlay extends Component<OverlayElementProps<"KeepInCircle">, object> {
  id = crypto.randomUUID();
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();
  componentDidMount() {
    if (this.rootRef.current) {
      const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event))
        .on("start", () => {
          doc.history.startGroup(() => {});
          this.props.select()
        })
        .on("end", (_event) => doc.history.stopGroup())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInCircle` + this.id
      ).call(dragHandleDrag);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInCircleDot` + this.id
      ).call(dragHandleDrag);
      const radiusHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointRadius(event))
        .on("start", () => {
          doc.history.startGroup(() => {});
          this.props.select();
        })
        .on("end", (_event) => doc.history.stopGroup())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragRadiusTarget-keepInCircle` + this.id
      ).call(radiusHandleDrag);
    }
  }

  dragPointTranslate(event: any) {
      this.props.data.x.set(this.props.data.serialize.props.x.val + event.dx);
      this.props.data.y.set(this.props.data.serialize.props.y.val + event.dy);
  }

  dragPointRadius(event: any) {
      const dx = event.x - this.props.data.serialize.props.x.val;
      const dy = event.y - this.props.data.serialize.props.y.val;
      const r = Math.sqrt(dx * dx + dy * dy);

      this.props.data.r.set(r);
  }

  getColor() : string {
    if (this.props.selected) return SELECT_COLOR;
    if (this.props.clickable) return MOVABLE_COLOR;
    return IMMOVABLE_COLOR;
  }
  render() {
    const data = this.props.data.serialize as DataMap["KeepInCircle"];
    const x = data.props.x.val;
    const y = data.props.y.val;
    const r = data.props.r.val;
    const color = this.getColor();
    return (
      <g ref={this.rootRef} onClick={
        () => {
          if (this.props.clickable) this.props.select();
        }}>
        {/* Main Circle */}
        <circle
          cx={x}
          cy={y}
          r={r - STROKE / 2}
          fill={color}
          fillOpacity={0.1}
          id={"dragTarget-keepInCircle" + this.id}
          pointerEvents={"visibleStroke"}
        ></circle>
        {/* Center Dot */}
        <circle
          cx={x}
          cy={y}
          r={r < DOT * 2 ? 0.0 : DOT}
          fill={color}
          fillOpacity={1.0}
          id={"dragTarget-keepInCircleDot" + this.id}
          pointerEvents={"visible"}
        ></circle>
        {/* Radius Handle */}
        <circle
          cx={x}
          cy={y}
          r={r - STROKE / 2}
          fill={"transparent"}
          pointerEvents={"visibleStroke"}
          stroke={color}
          strokeWidth={STROKE}
          strokeOpacity={1.0}
          id={"dragRadiusTarget-keepInCircle" + this.id}
        ></circle>
      </g>
    );
  }
}
export default observer(KeepInCircleOverlay);
