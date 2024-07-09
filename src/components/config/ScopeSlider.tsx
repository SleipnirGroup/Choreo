import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { Slider, SliderProps } from "@mui/material";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";

type Props = {
  isRange: boolean;
  points: IHolonomicWaypointStore[];
  startIndex: number;
  endIndex: number;
  setRange: (arg1: [number] | [number, number]) => void;
  sliderProps?: SliderProps;
};

type State = object;

class ScopeSlider extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    const isRange = this.props.isRange;
    const startIndex = this.props.startIndex;
    const endIndex = this.props.endIndex;
    const points = this.props.points;
    const pointcount = points.length;

    const sliderMarks = [
      { value: 0, label: "Start" },
      ...points.flatMap((point, idx) => {
        if (point.isInitialGuess) {
          return [];
        } else {
          return { value: idx + 1, label: idx + 1 };
        }
      }),
      { value: pointcount + 1, label: "End" }
    ];
    return (
      <div style={{ marginInline: "4ch" }}>
        {" "}
        <Slider
          sx={{
            '& .MuiSlider-markLabel[data-index="0"]': {
              transform: "translateX(-3.5ch)"
            },
            [`& .MuiSlider-markLabel[data-index="${pointcount + 1}"]`]: {
              transform: "translateX(0ch)"
            }
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
          {...this.props.sliderProps}
        ></Slider>
      </div>
    );
  }
}
export default observer(ScopeSlider);
