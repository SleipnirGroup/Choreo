import { observer } from "mobx-react";
import { Component } from "react";
import { doc, uiState } from "../../document/DocumentManager";
import PathAnimationSlider from "./PathAnimationSlider";
import IconButton from "@mui/material/IconButton";
import PlayIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import { autorun } from "mobx";
import { Tooltip } from "@mui/material";
import hotkeys from "hotkeys-js";

type Props = object;

type State = {
  running: boolean;
};

class PathAnimationPanel extends Component<Props, State> {
  state = {
    running: false
  };

  timerId = 0;
  totalTime = 0;
  i = 0;
  then = Date.now();
  step = (dt: number) => this.incrementTimer(dt);

  onStart() {
    this.then = Date.now();
    this.setState({ running: true });
    if (Math.abs(this.totalTime - uiState.pathAnimationTimestamp) < 0.05) {
      uiState.setPathAnimationTimestamp(0);
    }
    window.cancelAnimationFrame(this.timerId);
    this.timerId = requestAnimationFrame(this.step);
  }

  incrementTimer(_: number) {
    const dt = Date.now() - this.then;
    this.then = Date.now();
    if (this.state.running) {
      const pathAnimationTimestamp = uiState.pathAnimationTimestamp;
      if (pathAnimationTimestamp > this.totalTime) {
        uiState.setPathAnimationTimestamp(0);
      } else {
        uiState.setPathAnimationTimestamp(pathAnimationTimestamp + dt / 1e3);
      }

      this.timerId = requestAnimationFrame(this.step);
    }
  }

  onStop() {
    this.setState({ running: false });
    if (this.timerId !== 0) {
      window.cancelAnimationFrame(this.timerId);
    }
  }
  componentDidMount(): void {
    hotkeys("space", "all", (e) => {
      e.preventDefault();
      if (this.state.running) {
        this.onStop();
      } else {
        this.onStart();
      }
    });
    autorun(() => {
      const _ = doc.pathlist.activePathUUID;
      this.onStop();
    });
  }
  render() {
    const activePath = doc.pathlist.activePath;
    this.totalTime = doc.pathlist.activePath.trajectory.getTotalTimeSeconds();
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
          borderTop: "thin solid var(--divider-gray)"
        }}
      >
        <span
          style={{
            display:
              activePath.trajectory.fullTrajectory.length >= 2
                ? "flex"
                : "none",
            flexDirection: "row",
            width: "100%",
            height: "100%",
            gap: "10px"
          }}
        >
          <Tooltip
            disableInteractive
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
          <PathAnimationSlider></PathAnimationSlider>
        </span>
      </div>
    );
  }
}
export default observer(PathAnimationPanel);
