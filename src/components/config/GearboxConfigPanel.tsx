import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import { Button, Divider, FormControl, MenuItem, Select } from "@mui/material";
import { MotorCurve, MotorCurves, SwerveModules } from "./MotorCurves";

type Props = {};

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
            gap: "8px",
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
            onClick={() => {
              config.setMaxVelocity(
                MotorCurves[this.state.selectedMotor].motorMaxVelocity
              );
            }}
          >
            Apply
          </Button>
        </FormControl>
        <div style={{ flexGrow: 1 }}>
          <InputList noCheckbox>
            <Input
              title="at"
              suffix="Amps limit"
              enabled={true}
              setEnabled={(a) => null}
              number={this.state.currentLimit}
              setNumber={(currentLimit) => this.setState({ currentLimit })}
              showCheckbox={false}
            />
            <Input
              title=""
              suffix="RPM"
              enabled={false}
              setEnabled={(a) => null}
              number={MotorCurves[this.state.selectedMotor].motorMaxVelocity}
              showNumberWhenDisabled={
                MotorCurves[this.state.selectedMotor] !== undefined
              }
              setNumber={() => null}
              showCheckbox={false}
            />

            <Input
              title=""
              suffix="N · m"
              enabled={false}
              setEnabled={(a) => null}
              number={config.motorMaxTorque}
              setNumber={config!.setMaxTorque}
              showCheckbox={false}
            />
          </InputList>
        </div>
      </>
    );
  }
}
export default observer(RobotConfigPanel);
