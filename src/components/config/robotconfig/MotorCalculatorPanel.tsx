import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import InputList from "../../input/InputList";
import Input from "../../input/Input";
import { Button, FormControl, MenuItem, Select } from "@mui/material";
import {
  maxTorqueCurrentLimited,
  MotorCurves,
} from "./MotorCurves";

type Props = { rowGap: number };

type State = {
  selectedMotor: keyof typeof MotorCurves;
  currentLimit: number;
};

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = { selectedMotor: "NEO", currentLimit: 40 };
  render() {
    let config = this.context.model.document.robotConfig;
    return (
      <>
        <FormControl
          size="small"
          sx={{
            flexDirection: "row",
            height: "40px",
            marginBlock: `${0.5 * this.props.rowGap}px`,
            alignItems: "left",
            width: "100%",
          }}
        >
          <Select
            sx={{ flexGrow: 1 }}
            value={this.state.selectedMotor}
            onChange={(key) => {
              this.setState({ selectedMotor: key.target.value });
            }}
          >
            {Object.keys(MotorCurves).map((key) => (
              <MenuItem value={key}>
                {MotorCurves[key as keyof typeof MotorCurves].name}
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="outlined"
            onClick={() => {
              this.context.history.startGroup(() => {
                config.setMaxVelocity(
                  MotorCurves[this.state.selectedMotor].motorMaxVelocity
                );
                config.setMaxTorque(
                  maxTorqueCurrentLimited(
                    MotorCurves[this.state.selectedMotor].kt,
                    this.state.currentLimit
                  )
                );
              });
              this.context.history.stopGroup();
            }}
          >
            Apply
          </Button>
        </FormControl>
        <div
          style={{
            display: "flex",
            gap: `${this.props.rowGap}px`,
            flexDirection: "row",
            justifyContent: "flex-end",
            width: "fit-content",
          }}
        >
          <InputList noCheckbox rowGap={this.props.rowGap}>
            <Input
              title="Current Limit"
              suffix="A"
              enabled={true}
              setEnabled={(a) => null}
              roundingPrecision={0}
              number={this.state.currentLimit}
              setNumber={(currentLimit) => this.setState({ currentLimit })}
              showCheckbox={false}
            />
            <Input
              title="Preview Free Speed"
              suffix="RPM"
              enabled={false}
              setEnabled={(a) => null}
              roundingPrecision={0}
              number={MotorCurves[this.state.selectedMotor].motorMaxVelocity}
              showNumberWhenDisabled={
                MotorCurves[this.state.selectedMotor] !== undefined
              }
              setNumber={() => null}
              showCheckbox={false}
            />

            <Input
              title="Preview Max Torque"
              suffix="N · m"
              enabled={false}
              setEnabled={(a) => null}
              roundingPrecision={3}
              number={maxTorqueCurrentLimited(
                MotorCurves[this.state.selectedMotor].kt,
                this.state.currentLimit
              )}
              setNumber={() => null}
              showCheckbox={false}
            />
          </InputList>
        </div>
      </>
    );
  }
}
export default observer(RobotConfigPanel);
