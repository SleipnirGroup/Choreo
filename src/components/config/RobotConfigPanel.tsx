import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";

type Props = {};

type State = {};

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let config = this.context.model.document.robotConfig;
    return (
      <div className={styles.WaypointPanel}>
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
            title="Moment of Inertia"
            suffix="kg · m²"
            enabled={true}
            setEnabled={(a) => null}
            number={config.rotationalInertia}
            setNumber={config!.setRotationalInertia}
            showCheckbox={false}
            titleTooltip={"Robot moment of inertia around center vertical axis"}
          />

          <Input
            title="Max Velocity"
            suffix="rad/s"
            enabled={true}
            setEnabled={(a) => null}
            number={config.wheelMaxVelocity}
            setNumber={config!.setMaxVelocity}
            showCheckbox={false}
            titleTooltip="Wheel free speed"
          />

          <Input
            title="Max Torque"
            suffix="N · m"
            enabled={true}
            setEnabled={(a) => null}
            number={config.wheelMaxTorque}
            setNumber={config!.setMaxTorque}
            showCheckbox={false}
            titleTooltip="Max wheel torque at contact with ground"
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
        </InputList>
      </div>
    );
  }
}
export default observer(RobotConfigPanel);
