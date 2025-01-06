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
class KeepOutCircleOverlay extends Component<Props<"KeepOutCircle">, object> {
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();
  componentDidMount() {
    if (this.rootRef.current) {
      const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => doc.history.stopGroup())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(`#dragTarget-keepOutCircle`).call(
        dragHandleDrag
      );
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget-keepOutCircleDot`
      ).call(dragHandleDrag);
      const radiusHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointRadius(event))
        .on("start", () => {
          doc.history.startGroup(() => {});
        })
        .on("end", (_event) => doc.history.stopGroup())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragRadiusTarget-keepOutCircle`
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

  render() {
    const data = this.props.data.serialize as DataMap["KeepOutCircle"];
    const x = data.props.x.val;
    const y = data.props.y.val;
    const r = data.props.r.val;
    return (
      <g ref={this.rootRef}>
        {/* Main Circle */}
        <circle
          cx={x}
          cy={y}
          r={r - STROKE / 2}
          fill={"red"}
          fillOpacity={0.1}
          id="dragTarget-keepOutCircle"
        ></circle>
        {/* Center Dot */}
        <circle
          cx={x}
          cy={y}
          r={r < DOT * 2 ? 0.0 : DOT}
          fill={"red"}
          fillOpacity={1.0}
          id="dragTarget-keepOutCircleDot"
        ></circle>
        {/* Radius Handle */}
        <circle
          cx={x}
          cy={y}
          r={r - STROKE / 2}
          fill={"transparent"}
          pointerEvents={"visibleStroke"}
          stroke={"red"}
          strokeWidth={STROKE}
          strokeOpacity={1.0}
          id="dragRadiusTarget-keepOutCircle"
        ></circle>
      </g>
    );
  }
}
export default observer(KeepOutCircleOverlay);
