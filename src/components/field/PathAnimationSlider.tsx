import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import Slider from "@mui/material/Slider";
import { Tooltip } from "@mui/material";
import { NavbarItemData } from "../../document/UIStateStore";
import { Room } from "@mui/icons-material";
import { IEventMarkerStore } from "../../document/EventMarkerStore";

type Props = object;

type State = object;

class PathAnimationSlider extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  totalTime = 0;
  render() {
    const activePath = this.context.model.document.pathlist.activePath;
    this.totalTime = activePath.getTotalTimeSeconds();
    return (
      <>
        <Slider
          defaultValue={0}
          step={0.01}
          min={0}
          max={this.totalTime}
          marks={
            activePath.generated.length > 0
              ? activePath.generatedWaypoints
                  .flatMap((point, idx) => {
                    let type = 0;
                    if (point.isInitialGuess) {
                      type = 3; // Guess
                    } else if (point.headingConstrained) {
                      type = 0; // Full
                    } else if (point.translationConstrained) {
                      type = 1; // Translation
                    } else {
                      type = 2; // Empty
                    }
                    if (type == 3 || type == 2) {
                      return [];
                    }
                    let color = "white";
                    if (idx === 0) {
                      color = "green";
                    } else if (
                      idx ===
                      activePath.generatedWaypoints.length - 1
                    ) {
                      color = "red";
                    }
                    return [
                      {
                        value: point.timestamp,
                        label: (
                          <Tooltip
                            disableInteractive
                            title={idx + 1}
                            key={idx + 1}
                          >
                            <span>
                              {React.cloneElement(NavbarItemData[type].icon, {
                                htmlColor: color
                              })}
                            </span>
                          </Tooltip>
                        )
                      }
                    ];
                  })
                  .concat(
                    activePath.eventMarkers.flatMap(
                      (marker: IEventMarkerStore) => {
                        if (marker.timestamp === undefined) {
                          return [];
                        }
                        return {
                          value: marker.timestamp,
                          label: (
                            <span>
                              <Room
                                htmlColor={
                                  marker.selected
                                    ? "var(--select-yellow)"
                                    : "white"
                                }
                                stroke="black"
                                strokeWidth="0.5"
                                fontSize="large"
                                style={{
                                  transform: "translateY(calc(-3px - 50%))"
                                }}
                              ></Room>
                            </span>
                          )
                        };
                      }
                    )
                  )
              : false
          }
          aria-label="Default"
          valueLabelDisplay="auto"
          valueLabelFormat={(x: number) => x.toFixed(2)}
          value={this.context.model.uiState.pathAnimationTimestamp}
          onChange={(e, newVal) =>
            this.context.model.uiState.setPathAnimationTimestamp(
              newVal as number
            )
          }
          sx={{
            flexGrow: "1",
            width: "2",
            marginInline: "10px",
            ".MuiSlider-track, .MuiSlider-thumb": {
              transition: "unset",
              WebkitTransition: "unset"
            },
            ".MuiSlider-thumb": {
              width: "24px",
              height: "24px",
              zIndex: 2,
              ":hover,:active": {
                width: "24px",
                height: "24px"
              }
            },
            ".MuiSlider-mark": {
              display: "none"
            },
            ".MuiSlider-markLabel": {
              top: "unset",
              transform: "translateX(-50%) translateY(-10px)",
              zIndex: 1
            }
          }}
        />
        <span
          style={{ width: "min-content", whiteSpace: "nowrap" }}
        >{`${this.context.model.uiState.pathAnimationTimestamp.toFixed(
          1
        )} s / ${this.totalTime.toFixed(1)} s`}</span>
      </>
    );
  }
}
export default observer(PathAnimationSlider);
