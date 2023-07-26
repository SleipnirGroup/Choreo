import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import Slider from "@mui/material/Slider";
import IconButton from "@mui/material/IconButton";
import PlayIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import { autorun } from "mobx";
import { Tooltip } from "@mui/material";

type Props = {};

type State = {
  running: boolean;
};

class PathAnimationSlider extends Component<Props, State> {
  state = {
    running: false,
  };
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  timerId: number;

  onStart() {
    this.setState({ running: true });
    if (
      Math.abs(
        this.context.model.pathlist.activePath.getTotalTimeSeconds() -
          this.context.model.uiState.pathAnimationTimestamp
      ) < 0.1
    ) {
      this.context.model.uiState.setPathAnimationTimestamp(0);
    }
    this.timerId = window.setInterval(() => {
      if (
        this.context.model.uiState.pathAnimationTimestamp >
        this.context.model.pathlist.activePath.getTotalTimeSeconds()
      ) {
        this.context.model.uiState.setPathAnimationTimestamp(0);
        return;
      }
      this.context.model.uiState.setPathAnimationTimestamp(
        this.context.model.uiState.pathAnimationTimestamp + 0.01
      );
    }, 10);
  }

  onStop() {
    this.setState({ running: false });
    window.clearInterval(this.timerId);
  }
  componentDidMount(): void {
    autorun(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let activePath = this.context.model.pathlist.activePathUUID;
      this.onStop();
    });
  }
  render() {
    return (
      <div
        style={{
          color: "white",
          gap: "1rem",
          width: "100%",
          height: "2rem",
          backgroundColor: "var(--background-dark-gray)",
          paddingLeft: "10px",
          paddingRight: "10px",
          boxSizing: "border-box",
          display: "block",
        }}
      >
        <span
          style={{
            display:
              this.context.model.pathlist.activePath.generated.length >= 2
                ? "flex"
                : "none",
            flexDirection: "row",
            width: "100%",
            height: "100%",
            gap: "10px",
          }}
        >
          <Tooltip
            title={
              this.state.running
                ? "Pause Path Animation"
                : "Play Path Animation"
            }
          >
            <IconButton
              color="default"
              onClick={() => {
                if (this.state.running) {
                  this.onStop();
                } else {
                  this.onStart();
                }
              }}
            >
              {this.state.running ? (
                <PauseIcon></PauseIcon>
              ) : (
                <PlayIcon></PlayIcon>
              )}
            </IconButton>
          </Tooltip>
          <Slider
            defaultValue={0}
            step={0.01}
            min={0}
            max={this.context.model.pathlist.activePath.getTotalTimeSeconds()}
            aria-label="Default"
            valueLabelDisplay="auto"
            value={this.context.model.uiState.pathAnimationTimestamp}
            onChange={(e, newVal) =>
              this.context.model.uiState.setPathAnimationTimestamp(newVal as number)
            }
            sx={{
              flexGrow: "1",
              width: "2",

              ".MuiSlider-track, .MuiSlider-thumb": {
                transition: "unset",
                WebkitTransition: "unset",
              },
            }}
          />
          <span
            style={{ minWidth: "2.5rem" }}
          >{`${this.context.model.uiState.pathAnimationTimestamp.toFixed(
            1
          )} s`}</span>
        </span>
      </div>
    );
  }
}
export default observer(PathAnimationSlider);
