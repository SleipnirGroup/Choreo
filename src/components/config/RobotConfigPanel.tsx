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
          />

          <Input
            title="MoI"
            suffix="kg · m²"
            enabled={true}
            setEnabled={(a) => null}
            number={config.rotationalInertia}
            setNumber={config!.setRotationalInertia}
            showCheckbox={false}
          />

          <Input
            title="Max Velocity"
            suffix="rad/s"
            enabled={true}
            setEnabled={(a) => null}
            number={config.wheelMaxVelocity}
            setNumber={config!.setMaxVelocity}
            showCheckbox={false}
          />

          <Input
            title="Max Torque"
            suffix="N · m"
            enabled={true}
            setEnabled={(a) => null}
            number={config.wheelMaxTorque}
            setNumber={config!.setMaxTorque}
            showCheckbox={false}
          />

          <Input
            title="Width"
            suffix="m"
            enabled={true}
            setEnabled={(a) => null}
            number={config.bumperWidth}
            setNumber={config!.setBumperWidth}
            showCheckbox={false}
          />

          <Input
            title="Length"
            suffix="m"
            enabled={true}
            setEnabled={(a) => null}
            number={config.bumperLength}
            setNumber={config!.setBumperLength}
            showCheckbox={false}
          />

          <Input
            title="Wheelbase"
            suffix="m"
            enabled={true}
            setEnabled={(a) => null}
            number={config.wheelbase}
            setNumber={config!.setWheelbase}
            showCheckbox={false}
          />

          <Input
            title="Trackwidth"
            suffix="m"
            enabled={true}
            setEnabled={(a) => null}
            number={config.trackWidth}
            setNumber={config!.setTrackwidth}
            showCheckbox={false}
          />
          <Input
            title="Wheel Radius"
            suffix="m"
            enabled={true}
            setEnabled={(a) => null}
            number={config.wheelRadius}
            setNumber={config!.setWheelRadius}
            showCheckbox={false}
          />
        </InputList>
      </div>
    );
  }
}
export default observer(RobotConfigPanel);
