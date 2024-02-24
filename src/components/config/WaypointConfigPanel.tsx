import { observer } from "mobx-react";
import React, { Component, ReactElement } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../document/HolonomicWaypointStore";
import Input from "../input/Input";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { WaypointData } from "../../document/UIStateStore";
import { angleModulus } from "../../util/MathUtil";

type Props = { waypoint: IHolonomicWaypointStore | null };

type State = object;

class WaypointPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
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
          <InputList noCheckbox>
            <Input
              title="x"
              suffix="m"
              showCheckbox={false}
              enabled={true}
              setEnabled={(_) => {}}
              maxWidthCharacters={8}
              number={waypoint.x}
              setNumber={(x) => waypoint!.setX(x)}
            ></Input>
            <Input
              title="y"
              suffix="m"
              showCheckbox={false}
              enabled={true}
              setEnabled={(_) => {}}
              maxWidthCharacters={8}
              number={waypoint.y}
              setNumber={(y) => waypoint!.setY(y)}
            ></Input>
            <Input
              title="θ"
              suffix="rad"
              showCheckbox={false}
              enabled={waypoint.headingConstrained}
              setEnabled={(_) => {}}
              maxWidthCharacters={8}
              number={angleModulus(waypoint.heading)}
              setNumber={(heading) => waypoint!.setHeading(heading)}
            ></Input>
            <Input
              title=""
              suffix="samples"
              showCheckbox={false}
              enabled={true}
              setEnabled={(_) => {}}
              maxWidthCharacters={8}
              number={waypoint.controlIntervalCount}
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
