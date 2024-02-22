import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import { observer } from "mobx-react";
import * as d3 from "d3";
import { ICircularObstacleStore } from "../../../document/CircularObstacleStore";

type Props = { obstacle: ICircularObstacleStore; index: number };

type State = object;

const STROKE = 0.1;
const DOT = 0.1;

class FieldGrid extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  rootRef: React.RefObject<SVGElement> = React.createRef<SVGElement>();

  appendIndexID(id: string): string {
    return `${id}${this.props.index}`;
  }

  dragPointTranslate(event: any) {
    this.props.obstacle.setX(this.props.obstacle.x + event.dx);
    this.props.obstacle.setY(this.props.obstacle.y + event.dy);
  }

  dragPointRadius(event: any) {
    const dx = event.x - this.props.obstacle.x;
    const dy = event.y - this.props.obstacle.y;
    const r = Math.sqrt(dx * dx + dy * dy);

    this.props.obstacle.setRadius(r);
  }

  componentDidMount(): void {
    if (this.rootRef.current) {
      const dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event))
        .on("start", () => {
          this.context.model.select(this.props.obstacle);
          this.context.history.startGroup(() => {});
        })
        .on("end", (event) => this.context.history.stopGroup())
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
          this.context.model.select(this.props.obstacle);
          this.context.history.startGroup(() => {});
        })
        .on("end", (event) => this.context.history.stopGroup())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#oRadiusDragTarget${this.props.index}`
      ).call(radiusHandleDrag);
    }
  }

  render() {
    const o = this.props.obstacle;
    return (
      <g ref={this.rootRef}>
        {/* Main Circle */}
        <circle
          cx={o.x}
          cy={o.y}
          r={o.radius - STROKE / 2}
          fill={"red"}
          fillOpacity={0.1}
          onClick={() => this.context.model.select(o)}
          id={this.appendIndexID("oDragTarget")}
        ></circle>
        {/* Center Dot */}
        <circle
          cx={o.x}
          cy={o.y}
          r={o.radius < DOT * 2 ? 0.0 : DOT}
          fill={o.selected ? "var(--select-yellow)" : "red"}
          fillOpacity={o.selected ? 1.0 : 0.8}
          onClick={() => this.context.model.select(o)}
          id={this.appendIndexID("oCenterDragTarget")}
        ></circle>
        {/* Radius Handle */}
        <circle
          cx={o.x}
          cy={o.y}
          r={o.radius - STROKE / 2}
          fill={"transparent"}
          pointerEvents={"visibleStroke"}
          stroke={o.selected ? "var(--select-yellow)" : "red"}
          strokeWidth={STROKE}
          strokeOpacity={o.selected ? 1.0 : 0.8}
          onClick={() => this.context.model.select(o)}
          id={this.appendIndexID("oRadiusDragTarget")}
        ></circle>
      </g>
    );
  }
}
export default observer(FieldGrid);
