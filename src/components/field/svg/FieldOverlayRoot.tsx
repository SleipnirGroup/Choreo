import {
  Popover,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from "@mui/material";
import * as d3 from "d3";
import { observer } from "mobx-react";
import React, { Component } from "react";
import { Expr, Waypoint } from "../../../document/2025/DocumentTypes";
import { ConstraintKey } from "../../../document/ConstraintDefinitions";
import { IConstraintStoreKeyed } from "../../../document/ConstraintStore";
import { doc, uiState } from "../../../document/DocumentManager";
import {
  NavbarItemData,
  NavbarItemSectionEnds,
  NavbarLabels,
  ViewLayers
} from "../../../document/UIData";
import FieldAxisLines from "./FieldAxisLines";
import FieldEventMarkerAddLayer from "./FieldEventMarkerAddLayer";
import FieldEventMarkers from "./FieldEventMarkers";
import FieldGeneratedLines from "./FieldGeneratedLines";
import FieldGeneratedWaypoints from "./FieldGeneratedWaypoints";
import FieldGrid from "./FieldGrid";
import { DOMMatrixIdentity, FieldMatrixContext } from "./FieldMatrixContext";
import FieldPathLines from "./FieldPathLines";
import FieldSamples from "./FieldSamples";
import InterpolatedRobot from "./InterpolatedRobot";
import OverlayWaypoint from "./OverlayWaypoint";
import FieldConstraintAddLayer from "./constraintDisplay/FieldConstraintAddLayer";
import FieldConstraintDisplayLayer from "./constraintDisplay/FieldConstraintDisplayLayer";
import FieldImage2024 from "./fields/FieldImage2024";

type Props = object;

type State = {
  xPan: number;
  yPan: number;
  zoom: number;
  fieldMatrix: DOMMatrix;
};

class FieldOverlayRoot extends Component<Props, State> {
  state = {
    xPan: 0,
    yPan: 0,
    zoom: 1,
    fieldMatrix: DOMMatrixIdentity
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

    this.fieldSelection().on("contextmenu", (e) => {
      uiState.setContextMenuMouseSelection(e);
    });
  }

  private handleCloseContextMenu() {
    uiState.setContextMenuMouseSelection(undefined);
    uiState.setContextMenuSelectedWaypoint(undefined);
    uiState.setContextMenuWaypointType(undefined);
  }

  private handleContextMenuSelection(contextMenuWaypointType: number) {
    // User selects field without selecting a waypoint
    if (uiState.contextMenuMouseSelection === undefined) {
      return;
    }

    if (uiState.contextMenuSelectedWaypoint === undefined) {
      this.createWaypoint(
        new MouseEvent("contextmenu", {
          clientX: uiState.contextMenuMouseSelection[0],
          clientY: uiState.contextMenuMouseSelection[1]
        }),
        contextMenuWaypointType
      );
      uiState.setContextMenuMouseSelection(undefined);
    }

    // User selects a waypoint
    else {
      const waypoint =
        doc.pathlist.activePath.params.waypoints[
          uiState.contextMenuSelectedWaypoint
        ];
      waypoint.setType(contextMenuWaypointType);
      uiState.setContextMenuMouseSelection(undefined);
      uiState.setContextMenuSelectedWaypoint(undefined);
      uiState.setContextMenuWaypointType(undefined);
    }
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
    uiState.setFieldScalingFactor(factor);
    this.setState({
      fieldMatrix:
        this.frameRef.current!.getScreenCTM() ?? this.state.fieldMatrix
    });
  }
  render() {
    this.canvasHeightMeters = FieldImage2024.WIDTH_M + 1;
    this.canvasWidthMeters = FieldImage2024.LENGTH_M + 1;
    const layers = uiState.layers;
    const constraintSelected = uiState.isConstraintSelected();
    const eventMarkerSelected = uiState.isEventMarkerSelected();

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
        <FieldMatrixContext.Provider value={this.state.fieldMatrix}>
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
                <FieldImage2024 />
              </>
            )}
            {layers[ViewLayers.Grid] && <FieldGrid></FieldGrid>}
            {/* Waypoint mouse capture*/}

            {uiState.contextMenuMouseSelection && (
              <Popover
                anchorReference="anchorPosition"
                anchorPosition={{
                  left: uiState.contextMenuMouseSelection[0],
                  top: uiState.contextMenuMouseSelection[1]
                }}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "left"
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "left"
                }}
                open={uiState.contextMenuMouseSelection !== undefined}
                onClose={this.handleCloseContextMenu.bind(this)}
              >
                <div
                  style={{
                    margin: `${2}px`,
                    padding: `${2}px`
                  }}
                >
                  <ToggleButtonGroup>
                    {NavbarItemData.map(
                      (item, index) =>
                        index <= NavbarItemSectionEnds[0] && (
                          <>
                            <Tooltip
                              disableInteractive
                              title={item.name}
                              key={item.name}
                            >
                              <ToggleButton
                                value={`${index}`}
                                selected={
                                  uiState.contextMenuWaypointType == index
                                }
                                onClick={() => {
                                  this.handleContextMenuSelection(index);
                                }}
                                sx={{
                                  color: "var(--accent-purple)",
                                  "&.Mui-selected": {
                                    color: "var(--select-yellow)"
                                  }
                                }}
                              >
                                {item.icon}
                              </ToggleButton>
                            </Tooltip>
                          </>
                        )
                    )}
                  </ToggleButtonGroup>
                </div>
              </Popover>
            )}

            {layers[ViewLayers.Waypoints] &&
              uiState.isNavbarWaypointSelected() && (
                <circle
                  cx={0}
                  cy={0}
                  r={10000}
                  style={{ fill: "transparent" }}
                  onClick={(e) => this.createWaypointOnClick(e)}
                ></circle>
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
              doc.pathlist.activePath.params.waypoints
                .map((point, index) => {
                  const activePath = doc.pathlist.activePath;
                  if (
                    (activePath.ui.visibleWaypointsStart <= index &&
                      activePath.ui.visibleWaypointsEnd >= index) ||
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
              <FieldConstraintAddLayer lineColor="var(--select-yellow)"></FieldConstraintAddLayer>
            )}
            {eventMarkerSelected && (
              <FieldEventMarkerAddLayer></FieldEventMarkerAddLayer>
            )}
            {doc.isSidebarConstraintSelected && (
              <FieldConstraintDisplayLayer
                constraint={
                  doc.selectedSidebarItem as IConstraintStoreKeyed<ConstraintKey>
                }
                lineColor="var(--select-yellow)"
              ></FieldConstraintDisplayLayer>
            )}

            {!doc.isSidebarConstraintSelected &&
              doc.isSidebarConstraintHovered && (
                <FieldConstraintDisplayLayer
                  constraint={
                    doc.hoveredSidebarItem as IConstraintStoreKeyed<ConstraintKey>
                  }
                  lineColor="white"
                ></FieldConstraintDisplayLayer>
              )}
            {layers[ViewLayers.Trajectory] && (
              <InterpolatedRobot
                timestamp={uiState.pathAnimationTimestamp}
              ></InterpolatedRobot>
            )}
          </g>
        </FieldMatrixContext.Provider>
      </svg>
    );
  }

  createWaypoint(e: MouseEvent, waypointType: number): void {
    if (
      ![
        NavbarLabels.FullWaypoint,
        NavbarLabels.TranslationWaypoint,
        NavbarLabels.EmptyWaypoint
      ].includes(waypointType)
    ) {
      return;
    }
    const coords = this.screenSpaceToFieldSpace(this.svgRef?.current, {
      x: e.clientX,
      y: e.clientY
    });
    doc.history.startGroup(() => {
      const initial: Partial<Waypoint<Expr>> = {};
      if (
        waypointType == NavbarLabels.TranslationWaypoint ||
        waypointType == NavbarLabels.EmptyWaypoint
      ) {
        initial.fixHeading = false;
      }
      if (waypointType == NavbarLabels.EmptyWaypoint) {
        initial.fixTranslation = false;
      }
      initial.x = { exp: `${coords.x} m`, val: coords.x };
      initial.y = { exp: `${coords.y} m`, val: coords.y };
      initial.heading = { exp: `0 deg`, val: 0 };
      const newPoint = doc.pathlist.activePath.params.addWaypoint(initial);
      newPoint.setSelected(true);
    });
    doc.history.stopGroup();
  }

  createWaypointOnClick(
    e: React.MouseEvent<SVGCircleElement, MouseEvent>
  ): void {
    if (e.currentTarget === e.target) {
      this.createWaypoint(
        e as unknown as MouseEvent,
        uiState.selectedNavbarItem
      );
    }
  }
}

export default observer(FieldOverlayRoot);
