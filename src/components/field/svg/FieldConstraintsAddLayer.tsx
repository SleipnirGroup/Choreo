import React, { Component, Fragment } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";
import { ViewLayers } from "../../../document/UIStateStore";

type Props = object;

type State = object;

class FieldConstraintsAddLayer extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    const layers = this.context.model.uiState.layers;
    const activePath = this.context.model.document.pathlist.activePath;
    const selectedConstraint =
      this.context.model.uiState.getSelectedConstraint();
    const selectedConstraintDefinition =
      this.context.model.uiState.getSelectedConstraintDefinition();
    const waypoints = activePath.waypoints;
    return (
      <>
        {/* Draw circles on each waypoint */}
        {selectedConstraintDefinition!.wptScope &&
          waypoints
            .filter((waypoint) => !waypoint.isInitialGuess)
            .map((point, index) => {
              const activePath =
                this.context.model.document.pathlist.activePath;
              if (
                (activePath.visibleWaypointsStart <= index &&
                  activePath.visibleWaypointsEnd >= index) ||
                !layers[ViewLayers.Focus]
              ) {
                return (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={0.2}
                    fill={"black"}
                    fillOpacity={0.2}
                    stroke="white"
                    strokeWidth={0.05}
                    onClick={() => {
                      const constraintToAdd = selectedConstraint;
                      const newConstraint =
                        activePath.addConstraint(constraintToAdd);

                      if (newConstraint !== undefined) {
                        if (newConstraint.wptScope) {
                          if (newConstraint.sgmtScope) {
                            newConstraint.setScope([
                              { uuid: point.uuid },
                              { uuid: point.uuid }
                            ]);
                          } else {
                            newConstraint.setScope([{ uuid: point.uuid }]);
                          }
                        }
                        this.context.model.uiState.setSelectedSidebarItem(
                          newConstraint
                        );
                      }
                    }}
                  ></circle>
                );
              }
            })}
        {selectedConstraintDefinition!.sgmtScope &&
          activePath.nonGuessPoints
            .slice(0, activePath.nonGuessPoints.length - 1)
            .map((point1, index) => {
              const point2 = activePath.nonGuessPoints[index + 1];
              if (
                (activePath.visibleWaypointsStart <= index &&
                  activePath.visibleWaypointsEnd >= index + 1) ||
                !layers[ViewLayers.Focus]
              ) {
                return (
                  <Fragment key={`frag-${index}-${index + 1}`}>
                    <line
                      key={`line-${index}-${index + 1}`}
                      x1={point1.x}
                      x2={point2.x}
                      y1={point1.y}
                      y2={point2.y}
                      strokeDasharray={0.2}
                      stroke="white"
                      strokeWidth={0.05}
                    ></line>
                    <circle
                      key={`${index}-${index + 1}`}
                      cx={(point1.x + point2.x) / 2}
                      cy={(point1.y + point2.y) / 2}
                      r={0.2}
                      fill={"black"}
                      fillOpacity={0.2}
                      stroke="white"
                      strokeWidth={0.05}
                      onClick={() => {
                        const constraintToAdd =
                          this.context.model.uiState.getSelectedConstraint();
                        const newConstraint = activePath.addConstraint(
                          constraintToAdd,
                          [{ uuid: point1.uuid }, { uuid: point2.uuid }]
                        );

                        if (newConstraint !== undefined) {
                          this.context.model.uiState.setSelectedSidebarItem(
                            newConstraint
                          );
                        }
                      }}
                    ></circle>
                  </Fragment>
                );
              }
            })}
      </>
    );
  }
}
export default observer(FieldConstraintsAddLayer);
