import { observer } from "mobx-react";
import React, { Component, ReactElement } from "react";
import { doc, uiState } from "../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";
import Input from "../input/Input";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import { Checkbox, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { WaypointData } from "../../document/UIData";
import { angleModulus } from "../../util/MathUtil";
import ExpressionInput from "../input/ExpressionInput";
import ExpressionInputList from "../input/ExpressionInputList";
import BooleanInput from "../input/BooleanInput";

type Props = { waypoint: IHolonomicWaypointStore | null; index: number };

type State = object;

class WaypointPanel extends Component<Props, State> {
  state = {};

  isWaypointNonNull(
    point: IHolonomicWaypointStore | null
  ): point is IHolonomicWaypointStore {
    return (point as IHolonomicWaypointStore) !== null;
  }
  render() {
    const { waypoint, index } = this.props;
    const waypointType = this.props.waypoint?.type;
    if (this.isWaypointNonNull(waypoint)) {
      return (
        <div className={styles.WaypointPanel}>
          <span
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              padding: "inherit",
              background: "var(--darker-purple)",
              borderBottomLeftRadius: "8px",
              fontWeight: "bolder",
              fontSize: "1em"
            }}
          >
            {index + 1}
          </span>
          <ExpressionInputList>
            <ExpressionInput
              title="x"
              enabled={true}
              maxWidthCharacters={8}
              number={waypoint.x}
            ></ExpressionInput>
            <ExpressionInput
              title="y"
              enabled={true}
              maxWidthCharacters={8}
              number={waypoint.y}
            ></ExpressionInput>
            <ExpressionInput
              title="θ"
              enabled={waypoint.fixHeading}
              maxWidthCharacters={8}
              number={waypoint.heading}
              //setNumber={(heading) => waypoint!.setHeading(heading)}
            ></ExpressionInput>
            <BooleanInput
              title={"Split"}
              enabled={true} value={waypoint.split} setValue={s=>waypoint.setSplit(s)}
              titleTooltip="Split trajectory at this point. Does not force stopping."></BooleanInput>
          </ExpressionInputList>

          <InputList noCheckbox>
            <Input
              title=""
              suffix="samples"
              showCheckbox={false}
              enabled={true}
              setEnabled={(_) => {}}
              maxWidthCharacters={8}
              number={waypoint.intervals}
              roundingPrecision={0}
              setNumber={(_) => {}}
            ></Input>
          </InputList>

          <ToggleButtonGroup
            sx={{ marginInline: "auto", paddingTop: "8px" }}
            size="small"
            exclusive
            value={waypointType}
            onChange={(e, newSelection) => {
              waypoint?.setType(newSelection);
            }}
          >
            {Object.entries(WaypointData).map((entry) => {
              const waypoint: {
                index: number;
                name: string;
                icon: ReactElement;
              } = entry[1];
              return (
                <Tooltip
                  disableInteractive
                  key={waypoint.index}
                  value={waypoint.index}
                  title={waypoint.name}
                >
                  <ToggleButton
                    value={waypoint.index}
                    sx={{
                      color: "var(--accent-purple)",
                      "&.Mui-selected": {
                        color: "var(--select-yellow)"
                      }
                    }}
                  >
                    {waypoint.icon}
                  </ToggleButton>
                </Tooltip>
              );
            })}
          </ToggleButtonGroup>
        </div>
      );
    }
  }
}
export default observer(WaypointPanel);
