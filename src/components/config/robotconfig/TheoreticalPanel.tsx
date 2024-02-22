import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import InputList from "../../input/InputList";
import Input from "../../input/Input";

import { MetersOrFeet, MToFt } from "../../../util/UnitConversions";

type Props = { rowGap: number; imperial: boolean };

type State = object;

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = { selectedMotor: "NEO", currentLimit: 40 };
  render() {
    const config = this.context.model.document.robotConfig;
    const floorSpeed = config.wheelMaxVelocity * config.wheelRadius;
    const floorLinearForce = (4 * config.wheelMaxTorque) / config.wheelRadius; // N
    const floorLinearAccel = floorLinearForce / config.mass;
    const driveRadius = Math.hypot(config.wheelbase / 2, config.trackWidth / 2);
    const chassisTorque = floorLinearForce * driveRadius; // N*m
    //N*m/(kg*m*m) = N/(kg*m) = (kg*m/s^2)/(kg*m)=1/s^2= rad/s^2
    const chassisAngularAccel = chassisTorque / config.rotationalInertia; //N*m/(kg*m*m) = N/(kg*m)
    const floorAngularVelocity =
      (config.wheelMaxVelocity * config.wheelRadius) / driveRadius;
    const imp = this.props.imperial;
    return (
      <InputList noCheckbox rowGap={this.props.rowGap}>
        <span style={{ color: "transparent", height: 0 }}>Floor Speed</span>
        <span></span>
        <span style={{ color: "transparent", height: 0 }}>kg · m²</span>
        <span></span>
        <Input
          title="Floor Speed"
          suffix={`${MetersOrFeet(imp)}/s`}
          enabled={false}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={imp ? MToFt(floorSpeed) : floorSpeed}
          setNumber={() => null}
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Linear maximum speed when not rotating"
        />
        <Input
          title="Floor Accel"
          suffix={`${MetersOrFeet(imp)}/s²`}
          enabled={false}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={imp ? MToFt(floorLinearAccel) : floorLinearAccel}
          setNumber={() => null}
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Linear maximum acceleration when not rotating"
        />
        <Input
          title="Ang Speed"
          suffix={"rad/s"}
          enabled={false}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={floorAngularVelocity}
          setNumber={() => null}
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Maximum angular speed when spinning in place"
        />

        <Input
          title="Ang Accel"
          suffix={"rad/s²"}
          enabled={false}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={chassisAngularAccel}
          setNumber={() => null}
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Maximum angular acceleration when spinning in place"
        />
      </InputList>
    );
  }
}
export default observer(RobotConfigPanel);
