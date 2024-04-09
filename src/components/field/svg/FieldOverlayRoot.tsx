import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import OverlayWaypoint from "./OverlayWaypoint";
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
import FieldEventMarkers from "./FieldEventMarkers";
import FieldSamples from "./FieldSamples";
import FieldGeneratedWaypoints from "./FieldGeneratedWaypoints";
import FieldEventMarkerAddLayer from "./FieldEventMarkerAddLayer";

type Props = object;

type State = {
  xPan: number;
  yPan: number;
  zoom: number;
};

class FieldOverlayRoot extends Component<Props, State> {
  private static instance: FieldOverlayRoot | null = null;
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {
    xPan: 0,
    yPan: 0,
    zoom: 1
  };
  canvasHeightMeters!: number;
  canvasWidthMeters!: number;
  svgRef: React.RefObject<SVGSVGElement>;
  frameRef: React.RefObject<SVGGElement>;
  constructor(props: Props) {
    super(props);
    this.svgRef = React.createRef<SVGSVGElement>();
    this.frameRef = React.createRef<SVGGElement>();

    this.zoomBehavior = d3
      .zoom<SVGGElement, undefined>()
      .scaleExtent([0.3, 12])
      .on("zoom", (e) => this.zoomed(e));
  }

  private zoomBehavior: d3.ZoomBehavior<SVGGElement, undefined>;

  private transition = () => {
    return d3.transition().duration(750).ease(d3.easeCubicOut);
  };

  private fieldSelection = () => {
    return d3.select<SVGGElement, undefined>(this.svgRef.current!);
  };

  // x, y, k are the center coordinates (x, y) and scale factor (k = {0.3, 12})
  private center(x: number, y: number, k: number) {
    this.fieldSelection().call(this.zoomBehavior.scaleTo, k);

    this.fieldSelection()
      .transition(this.transition())
      .call(this.zoomBehavior.translateTo, x, -y);
  }

  componentDidMount(): void {
    // add event listeners for external events
    window.addEventListener("resize", () => this.handleResize());

    window.addEventListener("center", (e) => {
      this.center(
        (e as CustomEvent).detail.x,
        (e as CustomEvent).detail.y,
        (e as CustomEvent).detail.k
      );
    });

    window.addEventListener("zoomIn", () => {
      this.fieldSelection()
        .transition(this.transition())
        .call(this.zoomBehavior.scaleBy, 2);
    });

    window.addEventListener("zoomOut", () => {
      this.fieldSelection()
        .transition(this.transition())
        .call(this.zoomBehavior.scaleBy, 0.5);
    });

    // handle initial resizing and setup

    this.handleResize();

    this.fieldSelection().call(this.zoomBehavior).on("dblclick.zoom", null);
  }

  private zoomed(e: any) {
    this.handleResize();
    this.setState({
      xPan: e.transform.x,
      yPan: e.transform.y,
      zoom: e.transform.k
    });
  }
  private screenSpaceToFieldSpace(
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
  private getScalingFactor(current: SVGSVGElement | null): number {
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
  private handleResize() {
    const factor = this.getScalingFactor(this.svgRef?.current);
    this.context.model.uiState.setFieldScalingFactor(factor);
  }
  render() {
    this.canvasHeightMeters = FieldImage24.WIDTH_M + 1;
    this.canvasWidthMeters = FieldImage24.LENGTH_M + 1;
    const layers = this.context.model.uiState.layers;
    const constraintSelected =
      this.context.model.uiState.isConstraintSelected();
    const eventMarkerSelected =
      this.context.model.uiState.isEventMarkerSelected();
    return (
      <svg
        ref={this.svgRef}
        viewBox={`${-0.5} ${0.5 - this.canvasHeightMeters} ${
          this.canvasWidthMeters
        } ${this.canvasHeightMeters}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0
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
          <FieldAxisLines></FieldAxisLines>
          {/* Background */}
          {layers[ViewLayers.Field] && (
            <>
              {/* <JSONFieldImage24 opacity={10} imageHeightPx={1556} imageWidthPx={3112}></JSONFieldImage24> */}
              <FieldImage24></FieldImage24>
            </>
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
                  key={obstacle.uuid}
                ></FieldObstacle>
              )
            )}
          {/* Line paths */}
          {layers[ViewLayers.Waypoints] && <FieldPathLines></FieldPathLines>}
          {layers[ViewLayers.Trajectory] && (
            <FieldGeneratedLines></FieldGeneratedLines>
          )}
          {layers[ViewLayers.Samples] && layers[ViewLayers.Trajectory] && (
            <FieldSamples></FieldSamples>
          )}
          {layers[ViewLayers.Samples] && layers[ViewLayers.Trajectory] && (
            <FieldGeneratedWaypoints></FieldGeneratedWaypoints>
          )}
          <FieldEventMarkers></FieldEventMarkers>
          {layers[ViewLayers.Waypoints] &&
            this.context.model.document.pathlist.activePath.waypoints
              .map((point, index) => {
                const activePath =
                  this.context.model.document.pathlist.activePath;
                if (
                  (activePath.visibleWaypointsStart <= index &&
                    activePath.visibleWaypointsEnd >= index) ||
                  !layers[ViewLayers.Focus]
                ) {
                  return [
                    <OverlayWaypoint
                      waypoint={point}
                      index={index}
                      key={point.uuid}
                    ></OverlayWaypoint>,
                    point.selected
                  ];
                }
              })
              // sort, such that selected waypoint ends up last,
              // and thus above all the rest.
              // We sort the elements, not the waypoints, so that
              // each element still corresponds to the right waypoint index
              .sort((_, pt2) => {
                if (pt2?.[1]) {
                  return -1;
                }
                return 0;
              })
              .map((pt) => pt?.[0])}

          {constraintSelected && (
            <FieldConstraintsAddLayer></FieldConstraintsAddLayer>
          )}
          {eventMarkerSelected && (
            <FieldEventMarkerAddLayer></FieldEventMarkerAddLayer>
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
      const coords = this.screenSpaceToFieldSpace(this.svgRef?.current, {
        x: e.clientX,
        y: e.clientY
      });
      this.context.history.startGroup(() => {
        const newPoint =
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
      const coords = this.screenSpaceToFieldSpace(this.svgRef?.current, {
        x: e.clientX,
        y: e.clientY
      });
      this.context.history.startGroup(() => {
        this.context.model.document.pathlist.activePath.addObstacle(
          CircularObstacleStore.create({
            x: coords.x,
            y: coords.y,
            radius: 0.5,
            uuid: uuidv4()
          })
        );
      });
      this.context.history.stopGroup();
    }
  }
}

export default observer(FieldOverlayRoot);
