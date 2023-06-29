import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import OverlayWaypoint from "./OverlayWaypoint";
import FieldImage23 from "./fields/FieldImage23";
import * as d3 from "d3";
import FieldGrid from "./FieldGrid";
import FieldPathLines from "./FieldPathLines";
import InterpolatedRobot from "./InterpolatedRobot";
type Props = {};

type State = {
  xPan: number;
  yPan: number;
  zoom: number;
  mouseX: number;
  mouseY: number;
};

class FieldOverlayRoot extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {
    xPan: 0,
    yPan: 0,
    zoom: 1,
    mouseX: 0,
    mouseY: 0,
  };
  canvasHeightMeters: number;
  canvasWidthMeters: number;
  svgRef: React.RefObject<SVGSVGElement>;
  frameRef: React.RefObject<SVGGElement>;
  constructor(props: Props) {
    super(props);
    this.svgRef = React.createRef<SVGSVGElement>();
    this.frameRef = React.createRef<SVGGElement>();
  }
  componentDidMount(): void {
    window.addEventListener("resize", () => this.handleResize());
    this.handleResize();
    let zoomBehavior = d3
      .zoom<SVGGElement, undefined>()
      .on("zoom", (e) => this.zoomed(e));

    d3.select<SVGGElement, undefined>(this.svgRef.current!)
      .call(zoomBehavior)
      .on("dblclick.zoom", null);
  }
  zoomed(e: any) {
    this.handleResize();
    this.setState({
      xPan: e.transform.x,
      yPan: e.transform.y,
      zoom: e.transform.k,
    });
  }
  screenSpaceToFieldSpace(
    current: SVGSVGElement | null,
    { x, y }: { x: number; y: number }
  ): { x: number; y: number } {
    if (current && current !== undefined) {
      let origin = current.createSVGPoint();
      origin.x = x;
      origin.y = y;
      origin = origin.matrixTransform(
        this.frameRef.current!.getScreenCTM()!.inverse()
      );
      return { x: origin.x, y: origin.y };
    }
    return { x: 0, y: 0 };
  }
  getScalingFactor(current: SVGSVGElement | null): number {
    if (current && current !== undefined) {
      let origin = current.createSVGPoint();
      origin.x = 0;
      origin.y = 0;
      let zeroOne = current.createSVGPoint();
      zeroOne.x = 0;
      zeroOne.y = 1;
      origin = origin.matrixTransform(
        this.frameRef.current!.getScreenCTM()!.inverse()
      );
      zeroOne = zeroOne.matrixTransform(
        this.frameRef.current!.getScreenCTM()!.inverse()
      );
      return -(zeroOne.y - origin.y);
    }
    return 0;
  }
  handleResize() {
    let factor = this.getScalingFactor(this.svgRef?.current);
    this.context.uiState.setFieldScalingFactor(factor);
  }
  getMouseCoordinates(e: any) {
    let coords = d3.pointer(e, this.frameRef?.current);
    this.setState({ mouseX: coords[0], mouseY: coords[1] });
    return d3.pointer(e);
  }
  render() {
    this.canvasHeightMeters = FieldImage23.WIDTH_M + 1;
    this.canvasWidthMeters = FieldImage23.LENGTH_M + 1;

    return (
      <svg
        ref={this.svgRef}
        viewBox={`${-0.5} ${0.5 - this.canvasHeightMeters} ${
          this.canvasWidthMeters
        } ${this.canvasHeightMeters}`}
        onMouseMove={(e: any) => this.getMouseCoordinates(e)}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
        }}
        //
        id="field-svg-container"
      >
        <g
          transform={`
              matrix(${this.state.zoom} 0  0 ${-this.state.zoom} ${
            this.state.xPan
          } ${this.state.yPan})`}
          ref={this.frameRef}
          id="rootFrame"
        >
          {/* Background */}
          <FieldImage23 blue={true}></FieldImage23>
          <FieldGrid></FieldGrid>
          {/* Line paths */}
          <FieldPathLines></FieldPathLines>
          <circle
            cx={0}
            cy={0}
            r={10000}
            style={{ fill: "transparent" }}
            onClick={(e) => this.createWaypoint(e)}
          ></circle>
          {this.context.model.pathlist.activePath.waypoints.map(
            (point, index) => (
              <OverlayWaypoint waypoint={point} index={index}></OverlayWaypoint>
            )
          )}
          <InterpolatedRobot
            timestamp={this.context.uiState.pathAnimationTimestamp}
          ></InterpolatedRobot>
        </g>
      </svg>
    );
  }
  createWaypoint(e: React.MouseEvent<SVGCircleElement, MouseEvent>): void {
    if (e.currentTarget === e.target) {
      var coords = this.screenSpaceToFieldSpace(this.svgRef?.current, {
        x: e.clientX,
        y: e.clientY,
      });
      var newPoint = this.context.model.pathlist.activePath.addWaypoint();
      newPoint.setX(coords.x);
      newPoint.setY(coords.y);
    }
  }
}
export default observer(FieldOverlayRoot);
