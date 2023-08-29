import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";

import { observer } from "mobx-react";
import { ConstraintStore } from "../../../document/ConstraintStore";

type Props = {};

type State = {};

class FieldConstraintsAddLayer extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    let activePath = this.context.model.document.pathlist.activePath;
    let selectedConstraint = this.context.model.uiState.getSelectedConstraint();
    let selectedConstraintDefinition =
      this.context.model.uiState.getSelectedConstraintDefinition();
    let waypoints = activePath.waypoints;
    return (
      <>
        {/* Draw circles on each waypoint */}
        {selectedConstraintDefinition!.wptScope &&
          waypoints
            .filter((waypoint) => !waypoint.isInitialGuess)
            .map((point, index) => {
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
                    let constraintToAdd = selectedConstraint;
                    let newConstraint =
                      activePath.addConstraint(constraintToAdd);
                    console.log(JSON.stringify(newConstraint));

                    if (newConstraint !== undefined) {
                      console.log(newConstraint.wptScope);
                      if (newConstraint.wptScope) {
                        if (newConstraint.sgmtScope) {
                          newConstraint.setScope([
                            { uuid: point.uuid },
                            { uuid: point.uuid },
                          ]);
                        } else {
                          newConstraint.setScope([{ uuid: point.uuid }]);
                        }
                      }
                      this.context.model.uiState.setSelectedSidebarItem(
                        newConstraint
                      );
                    }
                    console.log(JSON.stringify(newConstraint));
                    console.log(activePath.asSavedPath());
                  }}
                ></circle>
              );
            })}
        {selectedConstraintDefinition!.sgmtScope &&
          activePath.nonGuessPoints
            .slice(0, activePath.nonGuessPoints.length - 1)
            .map((point1, index) => {
              let point2 = activePath.nonGuessPoints[index + 1];
              return (
                <>
                  <line
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
                      let constraintToAdd =
                        this.context.model.uiState.getSelectedConstraint();
                      let newConstraint =
                        activePath.addConstraint(constraintToAdd);
                      console.log(JSON.stringify(newConstraint));

                      if (newConstraint !== undefined) {
                        if (newConstraint.sgmtScope) {
                          newConstraint.setScope([
                            { uuid: point1.uuid },
                            { uuid: point2.uuid },
                          ]);
                        }
                        this.context.model.uiState.setSelectedSidebarItem(
                          newConstraint
                        );
                      }

                      console.log(JSON.stringify(newConstraint));
                      console.log(activePath.asSavedPath());
                    }}
                  ></circle>
                  {activePath.waypoints.length >= 2 && false && (
                    <>
                      <circle
                        key={`full`}
                        cx={
                          (activePath.waypoints[0].x +
                            activePath.waypoints[
                              activePath.waypoints.length - 1
                            ].x) /
                          2
                        }
                        cy={
                          (activePath.waypoints[0].y +
                            activePath.waypoints[
                              activePath.waypoints.length - 1
                            ].y) /
                          2
                        }
                        r={0.2}
                        fill={"black"}
                        fillOpacity={0.2}
                        stroke="white"
                        strokeWidth={0.05}
                        onClick={() => {
                          let constraintToAdd =
                            this.context.model.uiState.getSelectedConstraint();
                          let newConstraint =
                            activePath.addConstraint(constraintToAdd);
                          console.log(JSON.stringify(newConstraint));

                          if (newConstraint !== undefined) {
                            console.log(newConstraint.definition.sgmtScope);
                            if (newConstraint.definition.sgmtScope) {
                              newConstraint.setScope(["first", "last"]);
                            }
                            this.context.model.uiState.setSelectedSidebarItem(
                              newConstraint
                            );
                          }
                          console.log(JSON.stringify(newConstraint));
                          console.log(activePath.asSavedPath());
                        }}
                      ></circle>
                    </>
                  )}
                </>
              );
            })}
      </>
    );
  }
}
export default observer(FieldConstraintsAddLayer);
