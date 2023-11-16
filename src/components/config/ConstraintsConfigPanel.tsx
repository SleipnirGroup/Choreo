import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import inputStyles from "../input/InputList.module.css";
import { IConstraintStore } from "../../document/ConstraintStore";
import {
  Box,
  Button,
  ButtonGroup,
  IconButton,
  InputAdornment,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { AlignHorizontalLeft } from "@mui/icons-material";
import { toJS } from "mobx";

type Props = { constraint: IConstraintStore };

type State = {};

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let constraint = this.props.constraint;
    let definition = constraint.definition;
    let isSegmentConstraint = definition.sgmtScope;
    let startIndex = (this.props.constraint.getStartWaypointIndex() ?? 0) + 1;
    let endIndex = (this.props.constraint.getEndWaypointIndex() ?? 0) + 1;
    let points = this.props.constraint.getPath().waypoints;
    let pointcount = points.length;
    if (this.props.constraint.getSortedScope()[0] === "first") {
      startIndex = 0;
    }
    if (this.props.constraint.getSortedScope()[0] === "last") {
      startIndex = pointcount + 1;
    }
    if (this.props.constraint.getSortedScope()[1] === "last") {
      endIndex = pointcount + 1;
    }
    if (this.props.constraint.getSortedScope()[1] === "first") {
      endIndex = 0;
    }

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
      <div
        className={styles.WaypointPanel}
        style={{
          width: `min(80%, max(300px, calc(${pointcount} * 3ch + 8ch)))`,
        }}
      >
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
            value={isSegmentConstraint ? [startIndex, endIndex] : startIndex}
            marks={sliderMarks}
            track={isSegmentConstraint ? "normal" : false}
            onChange={(e, value: number | number[]) => {
              let selection = [];
              if (typeof value === "number") {
                selection = [value];
              } else {
                selection = value;
              }
              const lastIdx = pointcount + 1;
              this.props.constraint.setScope(
                selection.map((idx) => {
                  if (idx == 0) {
                    return "first";
                  } else if (idx == lastIdx) {
                    return "last";
                  } else {
                    return { uuid: points[idx - 1]?.uuid ?? "" };
                  }
                })
              );
            }}
          ></Slider>
        </div>

        <InputList>
          {/* {isSegmentConstraint && <>
            <span className={inputStyles.Title}>From</span>
            <span> */}

          {/* <input className={inputStyles.Number} value={(constraint.getStartWaypointIndex() ?? -1) + 1}></input>
            <span>Start</span><span>End</span></span>
            <span></span><span></span></>
          } */}
          {Object.entries(definition.properties).map((entry) => {
            let [key, propdef] = entry;
            let setterName = "set" + key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <Input
                key={key}
                title={propdef.name}
                suffix={propdef.units}
                enabled={true}
                setEnabled={(a) => null}
                //@ts-ignore
                number={constraint[key]}
                //@ts-ignore
                setNumber={constraint[setterName]}
                showCheckbox={false}
                titleTooltip={propdef.description}
              />
            );
          })}
        </InputList>
      </div>
    );
  }
}
export default observer(RobotConfigPanel);
