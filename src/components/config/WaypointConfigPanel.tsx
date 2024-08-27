import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { Component, ReactElement } from "react";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";
import { WaypointData } from "../../document/UIData";
import BooleanInput from "../input/BooleanInput";
import ExpressionInput from "../input/ExpressionInput";
import ExpressionInputList from "../input/ExpressionInputList";
import Input from "../input/Input";
import InputList from "../input/InputList";
import styles from "./WaypointConfigPanel.module.css";

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
    const { waypoint } = this.props;
    const waypointType = this.props.waypoint?.type;
    if (this.isWaypointNonNull(waypoint)) {
      return (
        <div className={styles.WaypointPanel}>
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
          </ExpressionInputList>

          <InputList>
            <Input
              title="Samples"
              suffix=""
              showCheckbox={!waypoint.isLast()}
              enabled={waypoint.overrideIntervals && !waypoint.isLast()}
              showNumberWhenDisabled={!waypoint.isLast()}
              setEnabled={(e) => {
                waypoint.setOverrideIntervals(e);
              }}
              maxWidthCharacters={8}
              number={waypoint.intervals}
              roundingPrecision={0}
              setNumber={(num) => {
                waypoint.setIntervals(num);
              }}
              titleTooltip="Override the number of samples between this and next waypoint"
            ></Input>
            <BooleanInput
              title={"Split"}
              enabled={true}
              value={waypoint.split}
              setValue={(s) => waypoint.setSplit(s)}
              titleTooltip="Split trajectory at this point. Does not force stopping."
            ></BooleanInput>
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
          {/* <span
            style={{
              width: "min-content",
              padding: "inherit",
              background: "var(--darker-purple)",
              borderBottomRightRadius: "8px",
              fontWeight: "bolder",
              fontSize: "1em",

            }}
          >
            {index + 1}
          </span> */}
        </div>
      );
    }
  }
}
export default observer(WaypointPanel);
