import { Component } from "react";
import { doc, uiState } from "../../../../document/DocumentManager";
import { ConstraintDefinitions } from "../../../../document/ConstraintDefinitions";

import { observer } from "mobx-react";
import { IHolonomicWaypointStore } from "../../../../document/HolonomicWaypointStore";
import { FieldMatrixContext } from "../FieldMatrixContext";
import FieldConstraintRangeLayer from "./FieldConstraintRangeLayer";
import { tracing } from "../../../../document/tauriTracing";

type Props = {
  lineColor?: string;
};
type State = {
  firstIndex?: number;
  mouseX?: number;
  mouseY?: number;
};

class FieldConstraintsAddLayer extends Component<Props, State> {
  static contextType = FieldMatrixContext;
  declare context: React.ContextType<typeof FieldMatrixContext>;
  state = { firstIndex: undefined, mouseX: undefined, mouseY: undefined };
  constructor(props: Props) {
    super(props);
  }

  addConstraint(
    points: IHolonomicWaypointStore[],
    start: number,
    end?: number
  ) {
    doc.setHoveredSidebarItem(undefined);
    doc.history.startGroup(() => {
      const constraintToAdd = uiState.getSelectedConstraintKey();
      const point1 = points[start];
      const point2 = end !== undefined ? points[end] : undefined;
      console.log("start uuid: ", point1.uuid);
      const newConstraint = doc.pathlist.activePath.params.addConstraint(
        constraintToAdd,
        true,
        { uuid: point1.uuid },
        point2 !== undefined ? { uuid: point2.uuid } : undefined
      );

      if (newConstraint !== undefined) {
        doc.setSelectedSidebarItem(newConstraint);
      }
      doc.history.stopGroup();
    });
    this.setState({ firstIndex: undefined });
  }

  get endIndex() {
    const { firstIndex } = this.state;
    const hoverIndex = doc.hoveredWaypointIndex;
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
    const { firstIndex } = this.state;
    const hoverIndex = doc.hoveredWaypointIndex;
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
    const activePath = doc.pathlist.activePath;
    const waypoints = activePath.params.waypoints;
    if (this.state.firstIndex === undefined) {
      return (
        <FieldConstraintRangeLayer
          points={waypoints}
          start={0}
          end={waypoints.length - 1}
          lineColor={lineColor}
          showCircles
          showLines={false}
          id="add-first-circles"
          onCircleClick={(id) => {
            tracing.debug("constraint from: ", id);
            const constraintToAdd = uiState.getSelectedConstraintKey();
            if (!ConstraintDefinitions[constraintToAdd].sgmtScope) {
              this.addConstraint(waypoints, id, undefined);
            } else {
              this.setState({ firstIndex: id });
            }
          }}
        ></FieldConstraintRangeLayer>
      );
    } else {
      const point = waypoints[this.state.firstIndex];
      if (point == undefined) {
        this.setState({ firstIndex: undefined });
        return <></>;
      }
      return (
        <>
          <circle
            cx={0}
            cy={0}
            r={10000}
            fill="black"
            opacity={0.01}
            style={{ pointerEvents: "visible" }}
            onMouseMove={(e) => {
              let coords = new DOMPoint(e.clientX, e.clientY);
              coords = coords.matrixTransform(this.context.inverse());
              this.setState({ mouseX: coords.x, mouseY: coords.y });
            }}
            onMouseLeave={(_e) =>
              this.setState({ mouseX: undefined, mouseY: undefined })
            }
          ></circle>
          {this.state.mouseX !== undefined &&
            this.state.mouseY !== undefined &&
            doc.hoveredWaypointIndex === undefined && (
              <line
                x1={point.x.value}
                y1={point.y.value}
                x2={this.state.mouseX}
                y2={this.state.mouseY}
                stroke={lineColor}
                strokeWidth={0.1}
                style={{ pointerEvents: "none" }}
                strokeDasharray={0.1}
              ></line>
            )}
          {doc.hoveredWaypointIndex !== undefined && (
            <FieldConstraintRangeLayer
              points={waypoints}
              start={this.startIndex!}
              end={this.endIndex!}
              lineColor={lineColor}
              showCircles={false}
              showLines
              id="add-second-lines"
            ></FieldConstraintRangeLayer>
          )}
          <FieldConstraintRangeLayer
            points={waypoints}
            start={0}
            end={waypoints.length - 1}
            lineColor={lineColor}
            showCircles
            showLines={false}
            id="add-second-circles"
            onCircleClick={(id) => {
              this.addConstraint(
                waypoints,
                Math.min(this.state.firstIndex!, id),
                Math.max(this.state.firstIndex!, id)
              );
            }}
            onCircleMouseOver={(id) => doc.setHoveredSidebarItem(waypoints[id])}
            onCircleMouseOff={(_id) => doc.setHoveredSidebarItem(undefined)}
          ></FieldConstraintRangeLayer>
        </>
      );
    }
  }
}

export default observer(FieldConstraintsAddLayer);
