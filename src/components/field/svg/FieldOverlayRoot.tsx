import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import OverlayWaypoint from "./OverlayWaypoint";
import FieldImage23 from "./fields/FieldImage23";
import * as d3 from "d3";
import FieldGrid from "./FieldGrid";
import FieldPathLines from "./FieldPathLines";
import InterpolatedRobot from "./InterpolatedRobot";
import { NavbarLabels, ViewLayers } from "../../../document/UIStateStore";
import FieldGeneratedLines from "./FieldGeneratedLines";
import FieldAxisLines from "./FieldAxisLines";
import FieldConstraintsAddLayer from "./FieldConstraintsAddLayer";
import FieldObstacle from "./FieldObstacles";
import { v4 as uuidv4 } from "uuid";
import { CircularObstacleStore } from "../../../document/CircularObstacleStore";
import FieldImage24 from "./fields/FieldImage24";

type Props = {};

type State = {
  xPan: number;
  yPan: number;
  zoom: number;
};

class FieldOverlayRoot extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {
    xPan: 0,
    yPan: 0,
    zoom: 1,
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
      .scaleExtent([0.3, 12])
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
    this.context.model.uiState.setFieldScalingFactor(factor);
  }
  render() {
    this.canvasHeightMeters = FieldImage24.WIDTH_M + 1;
    this.canvasWidthMeters = FieldImage24.LENGTH_M + 1;
    let layers = this.context.model.uiState.layers;
    let constraintSelected = this.context.model.uiState.isConstraintSelected();
    return (
      <svg
        ref={this.svgRef}
        viewBox={`${-0.5} ${0.5 - this.canvasHeightMeters} ${this.canvasWidthMeters
          } ${this.canvasHeightMeters}`}
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
              matrix(${this.state.zoom} 0  0 ${-this.state.zoom} ${this.state.xPan
            } ${this.state.yPan})`}
          ref={this.frameRef}
          id="rootFrame"
        >
          <FieldAxisLines></FieldAxisLines>
          {/* Background */}
          {layers[ViewLayers.Field] && (
            <FieldImage24 blue={true}></FieldImage24>
          )}
          {layers[ViewLayers.Grid] && <FieldGrid></FieldGrid>}
          {/* Obstacle and waypoint mouse capture*/}
          {layers[ViewLayers.Waypoints] &&
            this.context.model.uiState.isNavbarWaypointSelected() && (
              <circle
                cx={0}
                cy={0}
                r={10000}
                style={{ fill: "transparent" }}
                onClick={(e) => this.createWaypoint(e)}
              ></circle>
            )}
          {layers[ViewLayers.Obstacles] &&
            this.context.model.uiState.isNavbarObstacleSelected() && (
              <circle
                cx={0}
                cy={0}
                r={10000}
                style={{ fill: "transparent" }}
                onClick={(e) => this.createObstacle(e)}
              ></circle>
            )}
          {layers[ViewLayers.Obstacles] &&
            this.context.model.document.pathlist.activePath.obstacles.map(
              (obstacle, index) => (
                <FieldObstacle
                  obstacle={obstacle}
                  index={index}
                ></FieldObstacle>
              )
            )}
          {/* Line paths */}
          {layers[ViewLayers.Waypoints] && <FieldPathLines></FieldPathLines>}
          {layers[ViewLayers.Trajectory] && (
            <FieldGeneratedLines></FieldGeneratedLines>
          )}
          {layers[ViewLayers.Samples] &&
            this.context.model.document.pathlist.activePath.generated.map(
              (point) => (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={0.02}
                  fill="black"
                ></circle>
              )
            )}
          {layers[ViewLayers.Waypoints] &&
            this.context.model.document.pathlist.activePath.waypoints.map(
              (point, index) => (
                <OverlayWaypoint
                  waypoint={point}
                  index={index}
                  key={point.uuid}
                ></OverlayWaypoint>
              )
            )}
          {constraintSelected && (
            <FieldConstraintsAddLayer></FieldConstraintsAddLayer>
          )}
          {layers[ViewLayers.Trajectory] && (
            <InterpolatedRobot
              timestamp={this.context.model.uiState.pathAnimationTimestamp}
            ></InterpolatedRobot>
          )}
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
      this.context.history.startGroup(() => {
        var newPoint =
          this.context.model.document.pathlist.activePath.addWaypoint();
        newPoint.setX(coords.x);
        newPoint.setY(coords.y);
        newPoint.setSelected(true);
        const selectedItem = this.context.model.uiState.selectedNavbarItem;
        if (
          selectedItem == NavbarLabels.TranslationWaypoint ||
          selectedItem == NavbarLabels.EmptyWaypoint
        ) {
          newPoint.setHeadingConstrained(false);
        }
        if (selectedItem == NavbarLabels.EmptyWaypoint) {
          newPoint.setTranslationConstrained(false);
        }
        if (selectedItem == NavbarLabels.InitialGuessPoint) {
          newPoint.setInitialGuess(true);
        }
      });
      this.context.history.stopGroup();
    }
  }
  createObstacle(e: React.MouseEvent<SVGCircleElement, MouseEvent>): void {
    if (e.currentTarget === e.target) {
      var coords = this.screenSpaceToFieldSpace(this.svgRef?.current, {
        x: e.clientX,
        y: e.clientY,
      });
      this.context.history.startGroup(() => {
        var newObstacle =
          this.context.model.document.pathlist.activePath.addObstacle(
            CircularObstacleStore.create({
              x: coords.x,
              y: coords.y,
              radius: 0.5,
              uuid: uuidv4(),
            })
          );
        // const selectedItem = this.context.model.uiState.selectedNavbarItem;
      });
      this.context.history.stopGroup();
    }
  }
}
export default observer(FieldOverlayRoot);
