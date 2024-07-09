import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../../document/HolonomicWaypointStore";
import * as d3 from "d3";

type Props = { waypoint: IHolonomicWaypointStore; index: number };

type State = object;

type Coordinates = {
  x: number;
  y: number;
};
const targetRadius = 0.1;
const outlineWidth = 0.03;
class OverlayWaypoint extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  bumperRef: any;
  rootRef: React.RefObject<SVGGElement> = React.createRef<SVGGElement>();

  // Used to determine if the context has changed. User switching from another path or creating a new path.
  private isNewContext = true;

  BumperBox = observer(
    ({
      context,
      strokeColor,
      strokeWidthPx,
      dashed
    }: {
      context: React.ContextType<typeof DocumentManagerContext>;
      strokeColor: string;
      strokeWidthPx: number;
      dashed: boolean;
    }) => (
      <g>
        <defs>
          <path
            id={this.appendIndexID("bumpers")}
            d={
              dashed
                ? context.model.document.robotConfig.dashedBumperSVGElement()
                : context.model.document.robotConfig.bumperSVGElement()
            }
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
          strokeLinecap="square"
          fill={"transparent"}
          vectorEffect={"non-scaling-stroke"}
          style={{ pointerEvents: "none" }}
        />
      </g>
    )
  );
  // gets the angle in degrees between two points
  calcAngleRad(p1: Coordinates, p2: Coordinates) {
    const p1x = p1.x;
    const p1y = p1.y;
    return Math.atan2(p2.y - p1y, p2.x - p1x);
  }

  coordsFromWaypoint(): Coordinates {
    return {
      x: this.props.waypoint.x,
      y: this.props.waypoint.y
    };
  }
  dragPointRotate(event: any) {
    const pointerPos: Coordinates = { x: 0, y: 0 };
    pointerPos.x = event.x;
    pointerPos.y = event.y;

    const waypointCoordinates = this.coordsFromWaypoint();
    // calculates the difference between the current mouse position and the center line
    const angleFinal = this.calcAngleRad(waypointCoordinates, pointerPos);
    // gets the difference of the angles to get to the final angle
    // converts the values to stay inside the 360 positive

    // creates the new rotate position array
    this.props.waypoint.setHeading(angleFinal);
    //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)
  }

  // dragPointVelocityRotate(event: any) {
  //   let pointerPos: Coordinates = { x: 0, y: 0 };
  //   pointerPos.x = event.x;
  //   pointerPos.y = event.y;

  //   const waypointCoordinates = this.coordsFromWaypoint();
  //   // calculates the difference between the current mouse position and the center line
  //   var angleFinal = this.calcAngleRad(waypointCoordinates, pointerPos);
  //   // gets the difference of the angles to get to the final angle
  //   // converts the values to stay inside the 360 positive

  //   // creates the new rotate position array
  //   this.props.waypoint.setVelocityAngle(angleFinal);
  //   //d3.select(`#group`).attr('transform', `rotate(${ this.r.angle })`)
  // }

  dragPointTranslate(event: any) {
    const pointerPos: Coordinates = { x: 0, y: 0 };
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
      d3.select<SVGCircleElement, undefined>(
        `#waypointGroup${this.props.index}`
      ).on("contextmenu", (e) => {
        console.log("selecting waypoint: " + this.props.index);
        this.context.model.document.pathlist.activePath.selectOnly(
          this.props.index
        );
        this.context.model.uiState.setContextMenuMouseSelection(e);
        this.context.model.uiState.setContextMenuSelectedWaypoint(
          this.props.index
        );
        this.context.model.uiState.setContextMenuWaypointType(
          this.context.model.document.pathlist.activePath.waypoints[
            this.props.index
          ].type
        );
      });

      const rotateHandleDrag = d3
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

      // var velocityRotateHandleDrag = d3
      //   .drag<SVGCircleElement, undefined>()
      //   .on("drag", (event) => this.dragPointVelocityRotate(event))
      //   .on("end", (event) => this.context.history.stopGroup())
      //   .on("start", () => {
      //     this.selectWaypoint();
      //     this.context.history.startGroup(() => {});
      //   })
      //   .container(this.rootRef.current);
      // d3.select<SVGCircleElement, undefined>(
      //   `#velocityRotateTarget${this.props.index}`
      // ).call(velocityRotateHandleDrag);

      const dragHandleDrag = d3
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
    const waypoints = this.context.model.document.pathlist.activePath.waypoints;
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
    const waypoint = this.props.waypoint;
    const boxColorStr = this.getBoxColor();
    const robotConfig = this.context.model.document.robotConfig;
    return (
      <g ref={this.rootRef}>
        <g
          transform={`translate(${waypoint.x}, ${waypoint.y}) rotate(${
            (waypoint.heading * 180) / Math.PI
          })`}
          id={this.appendIndexID("waypointGroup")}
        >
          {
            <this.BumperBox
              context={this.context}
              strokeColor={boxColorStr}
              strokeWidthPx={6}
              dashed={this.props.waypoint.type !== 0}
            ></this.BumperBox>
          }
          {/* Heading drag point */}
          <circle
            cx={robotConfig.bumperLength / 2}
            cy={0}
            r={
              targetRadius *
              Math.min(robotConfig.bumperLength, robotConfig.bumperWidth)
            }
            id={this.appendIndexID("rotateTarget")}
            fill={boxColorStr}
            strokeWidth={outlineWidth}
            stroke="black"
          ></circle>

          {/* Center Drag Target */}
          {(() => {
            const type = this.props.waypoint.type;
            switch (type) {
              case 0: // Full
              case 1: // Translation
              case 2: // Empty
              case 3: // Guess
                return (
                  <circle
                    cx={0}
                    cy={0}
                    r={
                      targetRadius *
                      1.5 *
                      Math.min(
                        robotConfig.bumperLength,
                        robotConfig.bumperWidth
                      )
                    }
                    id={this.appendIndexID("dragTarget")}
                    fill={
                      type == 2 || type == 3
                        ? "transparent"
                        : this.getDragTargetColor()
                    }
                    stroke={
                      type == 2 || type == 3
                        ? this.getDragTargetColor()
                        : "black"
                    }
                    strokeDasharray={type == 3 ? targetRadius : 0}
                    strokeWidth={outlineWidth}
                    onClick={() => this.selectWaypoint()}
                  ></circle>
                );
                break;
              case 4: {
                // Question mark icon's raw svg
                const boxSize =
                  ((0.4 * 24) / 20) *
                  Math.min(robotConfig.bumperLength, robotConfig.bumperWidth);
                const sx = 1;
                const cx = 12;
                const cy = 12;
                const sy = -1;
                return (
                  <svg
                    viewBox="0 0 24 24"
                    width={boxSize}
                    height={boxSize}
                    x={-boxSize / 2}
                    y={-boxSize / 2}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={10}
                      fill={"black"}
                      onClick={() => this.selectWaypoint()}
                    ></circle>
                    <path
                      id={this.appendIndexID("dragTarget")}
                      fill={this.getDragTargetColor()}
                      transform={`matrix(${sx}, 0, 0, ${sy}, ${cx - sx * cx}, ${
                        cy - sy * cy
                      })`}
                      xmlns="http://www.w3.org/2000/svg"
                      d="M15.07,11.25L14.17,12.17C13.45,12.89 13,13.5 13,15H11V14.5C11,13.39 11.45,12.39 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.89 13.1,7 12,7A2,2 0 0,0 10,9H8A4,4 0 0,1 12,5A4,4 0 0,1 16,9C16,9.88 15.64,10.67 15.07,11.25M13,19H11V17H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"
                      onClick={() => this.selectWaypoint()}
                    />
                  </svg>
                );
              }
            }
          })()}
          {/* <circle
            cx={0}
            cy={0}
            r={
              0.2 * Math.min(robotConfig.bumperLength, robotConfig.bumperWidth)
            }
            id={this.appendIndexID("dragTarget")}
            fill={this.getDragTargetColor()}
            onClick={() => this.selectWaypoint()}
          ></circle> */}
        </g>
      </g>
    );
  }
}
export default observer(OverlayWaypoint);
