import * as d3 from "d3";
import { observer } from "mobx-react";
import React, { Component } from "react";
import { IConstraintDataStore } from "../../../../document/ConstraintDataStore";
import {
  ConstraintKey,
  DataMap
} from "../../../../document/ConstraintDefinitions";
import { doc } from "../../../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../../../document/HolonomicWaypointStore";
import { OverlayElementProps } from "./FieldConstraintDisplayLayer";

class PointAtOverlay extends Component<OverlayElementProps<"PointAt"> & {lineColor: string}, object> {
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();
  componentDidMount() {
    if (this.rootRef.current) {
      const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event))
        .on("start", () => {
          doc.history.startGroup(() => {});
          this.props.select();
        })
        .on("end", (_event) => doc.history.stopGroup())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(`#dragTarget-pointat`).call(
        dragHandleDrag
      );
    }
  }
  dragPointTranslate(event: any) {
      this.props.data.x.set(event.x);
      this.props.data.y.set(event.y);
  }
  render() {
    if (this.props.start === undefined) {
      return <></>;
    }
    const data = this.props.data.serialize as DataMap["PointAt"];
    const lineColor = this.props.selected ? "var(--select-yellow)" : "white"
    return (
      <g ref={this.rootRef} onClick={
        () => {
          if (this.props.clickable) this.props.select();
        }}>
        <circle
          cx={data.props.x.val}
          cy={data.props.y.val}
          r={0.1}
          stroke={lineColor}
          strokeWidth={0.02}
          fill="transparent"
        ></circle>
        <circle
          id="dragTarget-pointat"
          cx={data.props.x.val}
          cy={data.props.y.val}
          r={0.2}
          stroke={lineColor}
          strokeWidth={0.02}
          fill="transparent"
          pointerEvents={"visible"}
        ></circle>
      </g>
    );
  }
}
export default observer(PointAtOverlay);
