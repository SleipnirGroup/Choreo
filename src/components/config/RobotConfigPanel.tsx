import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import GearboxConfigPanel from "./GearboxConfigPanel";
import { Modal } from "@mui/material";

type Props = {};

type State = {};

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let config = this.context.model.document.robotConfig;
    return (
      <div
        style={{
          position: "absolute",
          background: "var(--background-light-gray)",
          color: "white",
          display: "grid",
          width: "100%",
          padding: "8px",
          gridTemplateColumns: "1fr 1fr",
          gridGap: "8px",
        }}
      >
        <div>
          <InputList noCheckbox>
            <Input
              title="Mass"
              suffix="kg"
              enabled={true}
              setEnabled={(a) => null}
              number={config.mass}
              setNumber={config!.setMass}
              showCheckbox={false}
              titleTooltip={"Total robot mass"}
            />

            <Input
              title="M.o.I."
              suffix="kg · m²"
              enabled={true}
              setEnabled={(a) => null}
              number={config.rotationalInertia}
              setNumber={config!.setRotationalInertia}
              showCheckbox={false}
              titleTooltip={
                "Robot moment of inertia around center vertical axis"
              }
            />

            <Input
              title="Width"
              suffix="m"
              enabled={true}
              setEnabled={(a) => null}
              number={config.bumperWidth}
              setNumber={config!.setBumperWidth}
              showCheckbox={false}
              titleTooltip="Width of robot with bumpers on"
            />

            <Input
              title="Length"
              suffix="m"
              enabled={true}
              setEnabled={(a) => null}
              number={config.bumperLength}
              setNumber={config!.setBumperLength}
              showCheckbox={false}
              titleTooltip="Length of robot with bumpers on"
            />

            <Input
              title="Wheelbase"
              suffix="m"
              enabled={true}
              setEnabled={(a) => null}
              number={config.wheelbase}
              setNumber={config!.setWheelbase}
              showCheckbox={false}
              titleTooltip="Front-back distance between wheel centers"
            />

            <Input
              title="Trackwidth"
              suffix="m"
              enabled={true}
              setEnabled={(a) => null}
              number={config.trackWidth}
              setNumber={config!.setTrackwidth}
              showCheckbox={false}
              titleTooltip="Left-right distance between wheel centers"
            />
          </InputList>
        </div>
        <div>
          <InputList noCheckbox>
            <Input
              title="Motor Max Velocity"
              suffix="RPM"
              enabled={true}
              setEnabled={(a) => null}
              number={config.motorMaxVelocity}
              setNumber={config!.setMaxVelocity}
              showCheckbox={false}
              titleTooltip="Motor free speed"
            />

            <Input
              title="Motor Max Torque"
              suffix="N · m"
              enabled={true}
              setEnabled={(a) => null}
              number={config.motorMaxTorque}
              setNumber={config!.setMaxTorque}
              showCheckbox={false}
              titleTooltip="Motor torque as current-limited"
            />

            <Input
              title="Gearing"
              suffix=":1"
              enabled={true}
              setEnabled={(a) => null}
              number={config.gearing}
              setNumber={config!.setGearing}
              showCheckbox={false}
              titleTooltip="Gearing between motor shaft and wheel axle (>1)"
            />
            <Input
              title="Wheel Radius"
              suffix="m"
              enabled={true}
              setEnabled={(a) => null}
              number={config.wheelRadius}
              setNumber={config!.setWheelRadius}
              showCheckbox={false}
              titleTooltip="Radius of swerve wheels"
            />
            <Input
              title="Floor Speed"
              suffix="m/s"
              enabled={false}
              setEnabled={(a) => null}
              number={config.wheelMaxVelocity * config.wheelRadius}
              setNumber={() => null}
              showCheckbox={false}
              titleTooltip="Linear maximum speed when not rotating"
            />
            <Input
              title="Floor Accel"
              suffix="m/s²"
              enabled={false}
              setEnabled={(a) => null}
              number={
                config.wheelMaxTorque / // N*m = (kg)(m^2)/(s^2)
                config.mass /
                config.wheelRadius
              }
              setNumber={() => null}
              showCheckbox={false}
              titleTooltip="Linear maximum acceleration when not rotating"
            />
          </InputList>
        </div>
          <GearboxConfigPanel></GearboxConfigPanel>
      </div>
    );
  }
}
export default observer(RobotConfigPanel);
