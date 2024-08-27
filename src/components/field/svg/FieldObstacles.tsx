import * as d3 from "d3";
import { observer } from "mobx-react";
import React, { Component } from "react";
import { ICircularObstacleStore } from "../../../document/CircularObstacleStore";
import { doc, select } from "../../../document/DocumentManager";

type Props = { obstacle: ICircularObstacleStore; index: number };

type State = object;

const STROKE = 0.1;
const DOT = 0.1;

class FieldGrid extends Component<Props, State> {
  state = {};
  rootRef: React.RefObject<SVGElement> = React.createRef<SVGElement>();

  appendIndexID(id: string): string {
    return `${id}${this.props.index}`;
  }

  dragPointTranslate(event: any) {
    this.props.obstacle.x.set(this.props.obstacle.x.value + event.dx);
    this.props.obstacle.y.set(this.props.obstacle.y.value + event.dy);
  }

  dragPointRadius(event: any) {
    const dx = event.x - this.props.obstacle.x.value;
    const dy = event.y - this.props.obstacle.y.value;
    const r = Math.sqrt(dx * dx + dy * dy);

    this.props.obstacle.radius.set(r);
  }

  componentDidMount(): void {
    if (this.rootRef.current) {
      const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event))
        .on("start", () => {
          select(this.props.obstacle);
          doc.history.startGroup(() => {});
        })
        .on("end", (event) => doc.history.stopGroup())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#oDragTarget${this.props.index}`
      ).call(dragHandleDrag);
      d3.select<SVGCircleElement, undefined>(
        `#oCenterDragTarget${this.props.index}`
      ).call(dragHandleDrag);

      const radiusHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointRadius(event))
        .on("start", () => {
          select(this.props.obstacle);
          doc.history.startGroup(() => {});
        })
        .on("end", (event) => doc.history.stopGroup())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#oRadiusDragTarget${this.props.index}`
      ).call(radiusHandleDrag);
    }
  }

  render() {
    const o = this.props.obstacle;
    const x = o.x.value;
    const y = o.y.value;
    const r = o.radius.value;
    return (
      <g ref={this.rootRef}>
        {/* Main Circle */}
        <circle
          cx={x}
          cy={y}
          r={r - STROKE / 2}
          fill={"red"}
          fillOpacity={0.1}
          onClick={() => select(o)}
          id={this.appendIndexID("oDragTarget")}
        ></circle>
        {/* Center Dot */}
        <circle
          cx={x}
          cy={y}
          r={r < DOT * 2 ? 0.0 : DOT}
          fill={o.selected ? "var(--select-yellow)" : "red"}
          fillOpacity={o.selected ? 1.0 : 0.8}
          onClick={() => select(o)}
          id={this.appendIndexID("oCenterDragTarget")}
        ></circle>
        {/* Radius Handle */}
        <circle
          cx={x}
          cy={y}
          r={r - STROKE / 2}
          fill={"transparent"}
          pointerEvents={"visibleStroke"}
          stroke={o.selected ? "var(--select-yellow)" : "red"}
          strokeWidth={STROKE}
          strokeOpacity={o.selected ? 1.0 : 0.8}
          onClick={() => select(o)}
          id={this.appendIndexID("oRadiusDragTarget")}
        ></circle>
      </g>
    );
  }
}
export default observer(FieldGrid);
