import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import { Divider, FormControl, MenuItem, Select } from "@mui/material";
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
        <Divider sx={{gridColumn:"1 / 3"}}></Divider>
        <div style={{ gridColumn:1}}>
          <FormControl
            size="small"
            sx={{
              flexDirection: "row",
              gap: "8px",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Select
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
            <div style={{ flexGrow: 1 }}>
              <InputList noCheckbox>
                <Input
                  title="at"
                  suffix="A current limit"
                  enabled={true}
                  setEnabled={(a) => null}
                  number={this.state.currentLimit}
                  setNumber={(currentLimit) => this.setState({ currentLimit })}
                  showCheckbox={false}
                  titleTooltip="Motor free speed"
                />
                <Input
                  title="and"
                  suffix="% efficiency"
                  enabled={true}
                  setEnabled={(a) => null}
                  number={this.state.currentLimit}
                  setNumber={(currentLimit) => this.setState({ currentLimit })}
                  showCheckbox={false}
                  titleTooltip="Motor free speed"
                />
              </InputList>
            </div>
          </FormControl>
          = {
            MotorCurves[this.state.selectedMotor].motorMaxVelocity
          } RPM and 1.000 N · m
        </div>
        <div style={{ gridColumn:2}}>
        <InputList noCheckbox>
        <Input
            title="Preview Max Velocity"
            suffix="RPM"
            enabled={false}
            setEnabled={(a) => null}
            number={MotorCurves[this.state.selectedMotor].motorMaxVelocity}
            showNumberWhenDisabled={MotorCurves[this.state.selectedMotor] !== undefined}
            setNumber={()=>null}
            showCheckbox={false}
            titleTooltip="Motor free speed"
          />

          <Input
            title="Preview Max Torque"
            suffix="N · m"
            enabled={false}
            setEnabled={(a) => null}
            number={config.motorMaxTorque}
            setNumber={config!.setMaxTorque}
            showCheckbox={false}
            titleTooltip="Motor torque as current-limited"
          />
        </InputList>
        </div>
</>
    );
  }
}
export default observer(RobotConfigPanel);
