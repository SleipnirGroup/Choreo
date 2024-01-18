import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { Slider } from "@mui/material";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";

type Props = {
  isRange: boolean;
  points: IHolonomicWaypointStore[];
  startIndex: number;
  endIndex: number;
  setRange: (arg1: [number] | [number, number]) => void;
};

type State = {};

class ScopeSlider extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let isRange = this.props.isRange;
    let startIndex = this.props.startIndex;
    let endIndex = this.props.endIndex;
    let points = this.props.points;
    let pointcount = points.length;

    const sliderMarks = [
      { value: 0, label: "Start" },
      ...points.flatMap((point, idx) => {
        if (point.isInitialGuess) {
          return [];
        } else {
          return { value: idx + 1, label: idx + 1 };
        }
      }),
      { value: pointcount + 1, label: "End" },
    ];
    return (
      <div style={{ marginInline: "4ch" }}>
        {" "}
        <Slider
          sx={{
            '& .MuiSlider-markLabel[data-index="0"]': {
              transform: "translateX(-3.5ch)",
            },
            [`& .MuiSlider-markLabel[data-index="${pointcount + 1}"]`]: {
              transform: "translateX(0ch)",
            },
          }}
          step={null}
          min={0}
          max={pointcount + 1}
          value={isRange ? [startIndex, endIndex] : startIndex}
          marks={sliderMarks}
          track={isRange ? "normal" : false}
          onChange={(e, value: number | number[]) => {
            let selection = [];
            if (typeof value === "number") {
              selection = [value] as [number];
            } else {
              selection = value.slice(0, 2) as [number, number];
            }
            this.props.setRange(selection);
          }}
        ></Slider>
      </div>
    );
  }
}
export default observer(ScopeSlider);
