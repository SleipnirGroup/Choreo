import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../../document/HolonomicWaypointStore";
import * as d3 from "d3";

type Props = { waypoint: IHolonomicWaypointStore; index: number };

type State = {};

type Coordinates = {
  x: number;
  y: number;
};
class OverlayWaypoint extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  bumperRef: any;
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();

  BumperBox = observer(
    ({
      context,
      strokeColor,
      strokeWidthPx,
    }: {
      context: React.ContextType<typeof DocumentManagerContext>;
      strokeColor: string;
      strokeWidthPx: number;
    }) => (
      <g>
        <defs>
          <path
            id={this.appendIndexID("bumpers")}
            d={context.model.document.robotConfig.bumperSVGElement()}
          ></path>
          <clipPath id={this.appendIndexID("clip")}>
            <use xlinkHref={`#${this.appendIndexID("bumpers")}`} />
          </clipPath>
        </defs>

        <use
          xlinkHref={`#${this.appendIndexID("bumpers")}`}
          clipPath={`url(#${this.appendIndexID("clip")})`}
          stroke={strokeColor}
          strokeWidth={strokeWidthPx * context.model.uiState.fieldScalingFactor}
          fill={"transparent"}
          vectorEffect={"non-scaling-stroke"}
          style={{ pointerEvents: "none" }}
        />
      </g>
    )
  );
  // gets the angle in degrees between two points
  calcAngleRad(p1: Coordinates, p2: Coordinates) {
    var p1x = p1.x;
    var p1y = p1.y;
    return Math.atan2(p2.y - p1y, p2.x - p1x);
  }

  coordsFromWaypoint(): Coordinates {
    return {
      x: this.props.waypoint.x,
      y: this.props.waypoint.y,
    };
  }
  dragPointRotate(event: any) {
    let pointerPos: Coordinates = { x: 0, y: 0 };
    pointerPos.x = event.x;
    pointerPos.y = event.y;

    const waypointCoordinates = this.coordsFromWaypoint();
    // calculates the difference between the current mouse position and the center line
    var angleFinal = this.calcAngleRad(waypointCoordinates, pointerPos);
    // gets the difference of the angles to get to the final angle
    // converts the values to stay inside the 360 positive

    // creates the new rotate position array
    this.props.waypoint.setHeading(angleFinal);
    //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)
  }

  dragPointVelocityRotate(event: any) {
    let pointerPos: Coordinates = { x: 0, y: 0 };
    pointerPos.x = event.x;
    pointerPos.y = event.y;

    const waypointCoordinates = this.coordsFromWaypoint();
    // calculates the difference between the current mouse position and the center line
    var angleFinal = this.calcAngleRad(waypointCoordinates, pointerPos);
    // gets the difference of the angles to get to the final angle
    // converts the values to stay inside the 360 positive

    // creates the new rotate position array
    this.props.waypoint.setVelocityAngle(angleFinal);
    //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)
  }

  dragPointTranslate(event: any) {
    let pointerPos: Coordinates = { x: 0, y: 0 };
    pointerPos.x = event.x;
    pointerPos.y = event.y;

    // gets the difference of the angles to get to the final angle
    // converts the values to stay inside the 360 positive

    // creates the new rotate position array
    this.props.waypoint.setX(pointerPos.x);
    this.props.waypoint.setY(pointerPos.y);

    //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)
  }
  selectWaypoint() {
    this.context.model.document.pathlist.activePath.selectOnly(
      this.props.index
    );
  }
  componentDidMount() {
    if (this.rootRef.current) {
      var rotateHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointRotate(event))
        .on("start", () => {
          this.selectWaypoint();
          this.context.history.startGroup(() => {});
        })
        .on("end", (event) => this.context.history.stopGroup())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#rotateTarget${this.props.index}`
      ).call(rotateHandleDrag);

      var velocityRotateHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointVelocityRotate(event))
        .on("end", (event) => this.context.history.stopGroup())
        .on("start", () => {
          this.selectWaypoint();
          this.context.history.startGroup(() => {});
        })
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#velocityRotateTarget${this.props.index}`
      ).call(velocityRotateHandleDrag);

      var dragHandleDrag = d3
        .drag<SVGCircleElement, undefined>()
        .on("drag", (event) => this.dragPointTranslate(event))
        .on("start", () => {
          this.selectWaypoint();
          this.context.history.startGroup(() => {});
        })
        .on("end", (event) => this.context.history.stopGroup())
        .container(this.rootRef.current);
      d3.select<SVGCircleElement, undefined>(
        `#dragTarget${this.props.index}`
      ).call(dragHandleDrag);
    }
  }

  appendIndexID(id: string): string {
    return `${id}${this.props.index}`;
  }

  getBoxColor() {
    return this.props.waypoint.selected
      ? "var(--select-yellow)"
      : "var(--accent-purple)";
  }
  getDragTargetColor(): string {
    let waypoints = this.context.model.document.pathlist.activePath.waypoints;
    let color = "var(--accent-purple)";
    if (waypoints.length >= 2) {
      if (this.props.index === 0) {
        color = "green";
      }
      if (this.props.index === waypoints.length - 1) {
        color = "red";
      }
    }

    if (this.props.waypoint.selected) {
      color = "var(--select-yellow)";
    }
    return color;
  }

  render() {
    let waypoint = this.props.waypoint;
    let boxColorStr = this.getBoxColor();
    let robotConfig = this.context.model.document.robotConfig;
    return (
      <g ref={this.rootRef}>
        <g
          transform={`translate(${waypoint.x}, ${waypoint.y}) rotate(${
            (waypoint.heading * 180) / Math.PI
          })`}
          id={this.appendIndexID("waypointGroup")}
        >
          {this.props.waypoint.headingConstrained && (
            <this.BumperBox
              context={this.context}
              strokeColor={boxColorStr}
              strokeWidthPx={3}
            ></this.BumperBox>
          )}

          {/* Velocity direction line */}
          <line
            x1={
              -1 *
              Math.cos(
                this.props.waypoint.velocityAngle - this.props.waypoint.heading
              )
            }
            y1={
              -1 *
              Math.sin(
                this.props.waypoint.velocityAngle - this.props.waypoint.heading
              )
            }
            x2={
              1 *
              Math.cos(
                this.props.waypoint.velocityAngle - this.props.waypoint.heading
              )
            }
            y2={
              1 *
              Math.sin(
                this.props.waypoint.velocityAngle - this.props.waypoint.heading
              )
            }
            stroke={"gray"}
            strokeWidth={3 * this.context.model.uiState.fieldScalingFactor}
            visibility={
              this.props.waypoint.velocityAngleConstrained
                ? "visible"
                : "hidden"
            }
          ></line>
          <polygon
            points={`
            -0.25,0.2 0.25,0 -0.25,-0.2 -0.125,0
          `}
            transform={`rotate(${
              ((this.props.waypoint.velocityAngle -
                this.props.waypoint.heading) *
                180.0) /
              Math.PI
            }) translate(1, 0)`}
            fill={"white"}
            visibility={
              this.props.waypoint.velocityAngleConstrained
                ? "visible"
                : "hidden"
            }
            onClick={() => this.selectWaypoint()}
            id={this.appendIndexID("velocityRotateTarget")}
          ></polygon>
          {/* Heading drag point */}
          <circle
            cx={robotConfig.bumperLength / 2}
            cy={0}
            r={
              0.2 * Math.min(robotConfig.bumperLength, robotConfig.bumperWidth)
            }
            id={this.appendIndexID("rotateTarget")}
            fill={boxColorStr}
            visibility={
              this.props.waypoint.headingConstrained ? "visible" : "hidden"
            }
          ></circle>

          {/* Center Drag Target */}
          <circle
            cx={0}
            cy={0}
            r={
              0.2 * Math.min(robotConfig.bumperLength, robotConfig.bumperWidth)
            }
            id={this.appendIndexID("dragTarget")}
            fill={this.getDragTargetColor()}
            onClick={() => this.selectWaypoint()}
          ></circle>
        </g>
      </g>
    );
  }
}
export default observer(OverlayWaypoint);
