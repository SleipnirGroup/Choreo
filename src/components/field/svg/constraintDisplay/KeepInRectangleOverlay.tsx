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

const STROKE = 0.1;
const DOT = 0.1;

type Props<K extends ConstraintKey> = {
  data: IConstraintDataStore<K>;
  start?: IHolonomicWaypointStore;
  end?: IHolonomicWaypointStore;
  lineColor: string;
};
class KeepInRectangleOverlay extends Component<
  Props<"KeepInRectangle">,
  object
> {
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();
  componentDidMount() {
    if (this.rootRef.current) {
      // Theres probably a better way to do this
      const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, false))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          this.fixWidthHeight();
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangle`
      ).call(dragHandleDrag);

      const dragHandleDragW = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, true, false))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          this.fixWidthHeight();
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleW`
      ).call(dragHandleDragW);

      const dragHandleDragWH = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, true, true))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          this.fixWidthHeight();
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleWH`
      ).call(dragHandleDragWH);

      const dragHandleDragH = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event, false, true))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          this.fixWidthHeight();
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleH`
      ).call(dragHandleDragH);

      const dragHandleRegion = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragRegionTranslate(event))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => {
          this.fixWidthHeight();
          doc.history.stopGroup();
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepInRectangleRegion`
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
    data.y.set(this.props.data.serialize.props.y.val + event.dy);
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

  render() {
    const data = this.props.data.serialize as DataMap["KeepInRectangle"];
    const x = data.props.x.val;
    const y = data.props.y.val;
    const w = data.props.w.val;
    const h = data.props.h.val;
    return (
      <g ref={this.rootRef}>
        {/* Fill Rect*/}
        <rect
          x={w >= 0 ? x : x + w}
          y={h >= 0 ? y : y + h}
          width={Math.abs(w)}
          height={Math.abs(h)}
          fill={"green"}
          fillOpacity={0.1}
          id="dragTarget-keepInRectangleRegion"
        ></rect>
        {/*Border Rect*/}
        <rect
          x={w >= 0 ? x : x + w}
          y={h >= 0 ? y : y + h}
          width={Math.abs(w)}
          height={Math.abs(h)}
          fill={"transparent"}
          pointerEvents={"visibleStroke"}
          stroke={"green"}
          strokeWidth={STROKE}
          strokeOpacity={1.0}
          id="dragTarget-keepInRectangleRegion"
        ></rect>
        {/* Corners */}
        <circle
          cx={x}
          cy={y}
          r={DOT}
          fill={"green"}
          fillOpacity={1.0}
          id="dragTarget-keepInRectangle"
        ></circle>
        <circle
          cx={x + w}
          cy={y}
          r={DOT}
          fill={"green"}
          fillOpacity={1.0}
          id="dragTarget-keepInRectangleW"
        ></circle>
        <circle
          cx={x + w}
          cy={y + h}
          r={DOT}
          fill={"green"}
          fillOpacity={1.0}
          id="dragTarget-keepInRectangleWH"
        ></circle>
        <circle
          cx={x}
          cy={y + h}
          r={DOT}
          fill={"green"}
          fillOpacity={1.0}
          id="dragTarget-keepInRectangleH"
        ></circle>
      </g>
    );
  }
}
export default observer(KeepInRectangleOverlay);
