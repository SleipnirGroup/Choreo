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

class KeepInRectangleOverlay extends Component<
  OverlayElementProps<"KeepInRectangle">,
  object
> {
  id = crypto.randomUUID();
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();
  componentDidMount() {
    if (this.rootRef.current) {
      const startDrag = (event: DragEvent) => {
        doc.history.startGroup(() => { });
        this.props.select();
      };
      const endDrag = () => {
        this.fixWidthHeight();
        doc.history.stopGroup();
      };
      // Theres probably a better way to do this
      const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, false))
        .on("start", startDrag)
        .on("end", endDrag)
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangle` + this.id
      ).call(dragHandleDrag);

      const dragHandleDragW = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, true, false))
        .on("start", startDrag)
        .on("end", endDrag)
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleW` + this.id
      ).call(dragHandleDragW);

      const dragHandleDragWH = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, true, true))
        .on("start", startDrag)
        .on("end", endDrag)
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleWH` + this.id
      ).call(dragHandleDragWH);

      const dragHandleDragH = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, true))
        .on("start", startDrag)
        .on("end", endDrag)
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleH` + this.id
      ).call(dragHandleDragH);

      const dragHandleRegion = d3
        .drag<SVGRectElement, undefined>()
        .on("drag", (event) => this.dragRegionTranslate(event))
        .on("start", startDrag)
        .on("end", endDrag)
        .container(this.rootRef.current);
      d3.select<SVGRectElement, undefined>(
        `#dragTarget-keepInRectangleRegion` + this.id
      ).call(dragHandleRegion);
    }
  }

  dragPointTranslate(event: any, xOffset: boolean, yOffset: boolean) {
    const data = this.props.data;
    console.log(xOffset, yOffset);
    data.x.set(data.serialize.props.x.val + event.dx * (xOffset ? 0.0 : 1.0));
    data.y.set(data.serialize.props.y.val + event.dy * (yOffset ? 0.0 : 1.0));

    data.w.set(data.serialize.props.w.val - event.dx * (xOffset ? -1.0 : 1.0));
    data.h.set(data.serialize.props.h.val - event.dy * (yOffset ? -1.0 : 1.0));
  }

  dragRegionTranslate(event: any) {
    const data = this.props.data;

    data.x.set(data.serialize.props.x.val + event.dx);
    data.y.set(data.serialize.props.y.val + event.dy);
  }

  fixWidthHeight() {
    if (this.props.data.serialize.props.w.val < 0.0) {
      this.props.data.x.set(
        this.props.data.serialize.props.x.val +
        this.props.data.serialize.props.w.val
      );
      this.props.data.w.set(-this.props.data.serialize.props.w.val);
    }

    if (this.props.data.serialize.props.h.val < 0.0) {
      this.props.data.y.set(
        this.props.data.serialize.props.y.val +
        this.props.data.serialize.props.h.val
      );
      this.props.data.h.set(-this.props.data.serialize.props.h.val);
    }
  }

  getColor(): string {
    if (this.props.selected) return SELECT_COLOR;
    if (this.props.clickable) return MOVABLE_COLOR;
    return IMMOVABLE_COLOR;
  }
  render() {
    const data = this.props.data.serialize as DataMap["KeepInRectangle"];
    const x = data.props.x.val;
    const y = data.props.y.val;
    const w = data.props.w.val;
    const h = data.props.h.val;
    let color = this.getColor();
    let movable = this.props.selected || this.props.clickable;
    let visible = movable ? "visible" : "none";
    let visibleStroke = movable ? "visibleStroke" : "none";
    return (
      <g ref={this.rootRef} onClick={
        (e) => {
          if (this.props.clickable) { this.props.select(); }
        }} >
        {/* Fill Rect*/}
        <rect
          x={w >= 0 ? x : x + w}
          y={h >= 0 ? y : y + h}
          width={Math.abs(w)}
          height={Math.abs(h)}
          fill={color}
          fillOpacity={0.05}
          pointerEvents={"none"}
        ></rect>
        {/*Border Rect*/}
        <rect
          x={w >= 0 ? x : x + w}
          y={h >= 0 ? y : y + h}
          width={Math.abs(w)}
          height={Math.abs(h)}
          fill={"transparent"}
          pointerEvents={visibleStroke}
          stroke={color}
          strokeWidth={STROKE}
          strokeOpacity={1.0}
          id={"dragTarget-keepInRectangleRegion" + this.id}
        ></rect>
        {/* Corners */}
        <circle
          cx={x}
          cy={y}
          r={DOT}
          fill={color}
          fillOpacity={1.0}
          pointerEvents={visible}
          id={"dragTarget-keepInRectangle" + this.id}
        ></circle>
        <circle
          cx={x + w}
          cy={y}
          r={DOT}
          fill={color}
          fillOpacity={1.0}
          pointerEvents={visible}
          id={"dragTarget-keepInRectangleW" + this.id}
        ></circle>
        <circle
          cx={x + w}
          cy={y + h}
          r={DOT}
          fill={color}
          fillOpacity={1.0}
          pointerEvents={visible}
          id={"dragTarget-keepInRectangleWH" + this.id}
        ></circle>
        <circle
          cx={x}
          cy={y + h}
          r={DOT}
          fill={color}
          fillOpacity={1.0}
          pointerEvents={visible}
          id={"dragTarget-keepInRectangleH" + this.id}
        ></circle>
      </g>
    );
  }
}
export default observer(KeepInRectangleOverlay);
