import React, { Component, Fragment } from "react";
import { doc, uiState } from "../../../document/DocumentManager";

import { observer } from "mobx-react";
import { ViewLayers } from "../../../document/UIData";

function FieldConstraintsAddLayer() {
  

  // state = {};

  // render() {
    const layers = uiState.layers;
    const activePath = doc.pathlist.activePath;
    const selectedConstraint =
      uiState.getSelectedConstraint();
    const selectedConstraintDefinition =
      uiState.getSelectedConstraintDefinition();
    const waypoints = activePath.waypoints;
    return (
      <>
        {/* Draw circles on each waypoint */}
        {selectedConstraintDefinition!.wptScope &&
          waypoints
            .filter((waypoint) => !waypoint.isInitialGuess)
            .map((point, index) => {
              const activePath =
                doc.pathlist.activePath;
              if (
                (activePath.visibleWaypointsStart <= index &&
                  activePath.visibleWaypointsEnd >= index) ||
                !layers[ViewLayers.Focus]
              ) {
                return (
                  <circle
                    key={index}
                    cx={point.x.value}
                    cy={point.y.value}
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
                        doc.setSelectedSidebarItem(
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
                      x1={point1.x.value}
                      x2={point2.x.value}
                      y1={point1.y.value}
                      y2={point2.y.value}
                      strokeDasharray={0.2}
                      stroke="white"
                      strokeWidth={0.05}
                    ></line>
                    <circle
                      key={`${index}-${index + 1}`}
                      cx={(point1.x.value + point2.x.value) / 2}
                      cy={(point1.y.value + point2.y.value) / 2}
                      r={0.2}
                      fill={"black"}
                      fillOpacity={0.2}
                      stroke="white"
                      strokeWidth={0.05}
                      onClick={() => {
                        const constraintToAdd =
                          uiState.getSelectedConstraintKey();
                
                        const newConstraint = activePath.addConstraint(
                          constraintToAdd,
                          [{ uuid: point1.uuid }, { uuid: point2.uuid }]
                        );

                        if (newConstraint !== undefined) {
                          doc.setSelectedSidebarItem(
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

export default observer(FieldConstraintsAddLayer);
