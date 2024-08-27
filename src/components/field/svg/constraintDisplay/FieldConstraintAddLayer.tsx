import { Component, Fragment } from "react";
import { doc, uiState } from "../../../../document/DocumentManager";

import { observer } from "mobx-react";
import { ViewLayers } from "../../../../document/UIData";
import FieldConstraintRangeLayer from "./FieldConstraintRangeLayer";
import { IHolonomicWaypointStore } from "../../../../document/HolonomicWaypointStore";

type Props = {
    lineColor?:string;
};
type State = {
    firstIndex?: number,
    mouseX?: number,
    mouseY?: number
}

class FieldConstraintsAddLayer extends Component<Props, State> {
    state = { firstIndex: undefined, mouseX: undefined, mouseY: undefined }
    constructor(props: Props) {
        super(props);
    }

    addConstraint(points: IHolonomicWaypointStore[], start: number, end: number) {
        doc.history.startGroup(() => {
            const constraintToAdd =
                uiState.getSelectedConstraintKey();
            let point1 = points[start];
            let point2 = points[end];
            const newConstraint = doc.pathlist.activePath.path.addConstraint(
                constraintToAdd,
                { uuid: point1.uuid },
                { uuid: point2.uuid }
            );

            if (newConstraint !== undefined) {
                doc.setSelectedSidebarItem(newConstraint);
            }
            doc.history.stopGroup();
        });

    }

    get endIndex() {
        let {firstIndex} = this.state;
        let hoverIndex = doc.hoveredWaypointIndex;
        if (firstIndex !== undefined) {
            if (hoverIndex !== undefined) {
                return Math.max(firstIndex, hoverIndex);
            } else {
                return firstIndex;
            }
        }
        return undefined;
    }

    get startIndex() {
        let {firstIndex} = this.state;
        let hoverIndex = doc.hoveredWaypointIndex;
        if (firstIndex !== undefined) {
            if (hoverIndex !== undefined) {
                return Math.min(firstIndex, hoverIndex);
            } else {
                return firstIndex;
            }
        }
        return undefined;
    }
    render() {
        const lineColor = this.props.lineColor ?? "white";
        const layers = uiState.layers;
        const activePath = doc.pathlist.activePath;
        const selectedConstraint = uiState.getSelectedConstraintKey();
        const selectedConstraintDefinition =
            uiState.getSelectedConstraintDefinition();
        const waypoints = activePath.path.waypoints;
        if (this.state.firstIndex === undefined) {
            return <FieldConstraintRangeLayer points={waypoints} start={0} end={waypoints.length - 1}
                lineColor={lineColor}
                showCircles
                showLines={false}
                id="add-first-circles"
                onCircleClick={(id) => {
                    console.log("constraint from: ", id)
                    this.setState({ firstIndex: id })
                }}></FieldConstraintRangeLayer>
        } else {
            const point = waypoints[this.state.firstIndex];
            return <>
                <circle 
                    cx={0} 
                    cy={0}
                    r={10000}
                    fill="black"
                    opacity={0.01}
                    style={{pointerEvents: "visible"}}
                    onMouseMove={e => {
                        let coords = new DOMPoint(e.clientX, e.clientY);
                        coords = coords.matrixTransform(uiState.fieldCTM.inverse());
                        this.setState({ mouseX: coords.x, mouseY: coords.y });
                    }} 

                    onMouseLeave={(e) => this.setState({ mouseX: undefined, mouseY: undefined })}></circle>
                {this.state.mouseX !== undefined && this.state.mouseY !== undefined && doc.hoveredWaypointIndex === undefined &&
                    <line
                        x1={point.x.value}
                        y1={point.y.value}
                        x2={this.state.mouseX}
                        y2={this.state.mouseY}
                        stroke={lineColor}
                        strokeWidth={0.1}
                        style={{ "pointerEvents": "none" }}
                        strokeDasharray={0.1}
                    ></line>}
                    {doc.hoveredWaypointIndex !== undefined &&
                    <FieldConstraintRangeLayer points={waypoints}
                        start={this.startIndex!}
                        end={this.endIndex!}
                        lineColor={lineColor}
                        showCircles={false}
                        showLines
                        id="add-second-lines"
                    ></FieldConstraintRangeLayer>}
                <FieldConstraintRangeLayer points={waypoints} start={0} end={waypoints.length - 1}
                    lineColor={lineColor}
                    showCircles
                    showLines={false}
                    id="add-second-circles"
                    onCircleClick={(id) => {
                        
                        doc.setHoveredSidebarItem(undefined);
                        this.addConstraint(waypoints, Math.min(this.state.firstIndex!, id), Math.max(this.state.firstIndex!, id));
                        this.setState({ firstIndex: undefined });
                        
                    }}
                    onCircleMouseOver={(id) => doc.setHoveredSidebarItem(waypoints[id])}
                    onCircleMouseOff={(id) => doc.setHoveredSidebarItem(undefined)}
                ></FieldConstraintRangeLayer>

            </>
        }
        //   return (
        //     <>

        //       {/* Draw circles on each waypoint */}
        //       {selectedConstraintDefinition!.wptScope &&
        //         waypoints.map((point, index) => {
        //           const activePath = doc.pathlist.activePath;
        //           if (
        //             (activePath.ui.visibleWaypointsStart <= index &&
        //               activePath.ui.visibleWaypointsEnd >= index) ||
        //             !layers[ViewLayers.Focus]
        //           ) {
        //             return (
        //               <circle
        //                 key={index}
        //                 cx={point.x.value}
        //                 cy={point.y.value}
        //                 r={0.2}
        //                 fill={"black"}
        //                 fillOpacity={0.2}
        //                 stroke="white"
        //                 strokeWidth={0.05}
        //                 onClick={() => {
        //                   doc.history.startGroup(() => {
        //                     const constraintToAdd = selectedConstraint;
        //                     const newConstraint = activePath.path.addConstraint(
        //                       constraintToAdd,
        //                       { uuid: point.uuid }
        //                     );

        //                     if (newConstraint !== undefined) {
        //                       if (newConstraint.wptScope) {
        //                         if (newConstraint.sgmtScope) {
        //                           newConstraint.setTo({ uuid: point.uuid });
        //                         }
        //                       }
        //                       doc.setSelectedSidebarItem(newConstraint);
        //                     }
        //                     doc.history.stopGroup();
        //                   });
        //                 }}
        //               ></circle>
        //             );
        //           }
        //         })}
        //       {selectedConstraintDefinition!.sgmtScope &&
        //         activePath.path.waypoints.slice(0, -1).map((point1, index) => {
        //           const point2 = activePath.path.waypoints[index + 1];
        //           if (
        //             (activePath.ui.visibleWaypointsStart <= index &&
        //               activePath.ui.visibleWaypointsEnd >= index + 1) ||
        //             !layers[ViewLayers.Focus]
        //           ) {
        //             return (
        //               <Fragment key={`frag-${index}-${index + 1}`}>
        //                 <line
        //                   key={`line-${index}-${index + 1}`}
        //                   x1={point1.x.value}
        //                   x2={point2.x.value}
        //                   y1={point1.y.value}
        //                   y2={point2.y.value}
        //                   strokeDasharray={0.2}
        //                   stroke="white"
        //                   strokeWidth={0.05}
        //                 ></line>
        //                 <circle
        //                   key={`${index}-${index + 1}`}
        //                   cx={(point1.x.value + point2.x.value) / 2}
        //                   cy={(point1.y.value + point2.y.value) / 2}
        //                   r={0.2}
        //                   fill={"black"}
        //                   fillOpacity={0.2}
        //                   stroke="white"
        //                   strokeWidth={0.05}
        //                   onClick={() => {
        //                     doc.history.startGroup(() => {
        //                       const constraintToAdd =
        //                         uiState.getSelectedConstraintKey();

        //                       const newConstraint = activePath.path.addConstraint(
        //                         constraintToAdd,
        //                         { uuid: point1.uuid },
        //                         { uuid: point2.uuid }
        //                       );

        //                       if (newConstraint !== undefined) {
        //                         doc.setSelectedSidebarItem(newConstraint);
        //                       }
        //                     });
        //                     doc.history.stopGroup();
        //                   }}
        //                 ></circle>
        //               </Fragment>
        //             );
        //           }
        //         })}
        //     </>
        //   );
    }
}

export default observer(FieldConstraintsAddLayer);
