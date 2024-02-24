import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import Slider from "@mui/material/Slider";
import { Tooltip } from "@mui/material";
import { NavbarItemData } from "../../document/UIStateStore";

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
              ? activePath.waypoints.flatMap((point, idx) =>
                  point.isInitialGuess || point.type == 2
                    ? []
                    : [
                        {
                          value: activePath.waypointTimestamps()[idx],
                          label: (
                            <Tooltip
                              disableInteractive
                              title={idx + 1}
                              key={idx + 1}
                            >
                              <span>
                                {React.cloneElement(
                                  NavbarItemData[point.type].icon,
                                  {
                                    htmlColor: point.selected
                                      ? "var(--select-yellow)"
                                      : "white"
                                  }
                                )}
                              </span>
                            </Tooltip>
                          )
                        }
                      ]
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
