import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../../input/InputList";
import Input from "../../input/Input";

import {
  InToM,
  KgToLbs,
  KG_TO_LBS,
  LbsToKg,
  MassUnit,
  MetersOrFeet,
  MetersOrInches,
  MToFt,
  MToIn,
  M_TO_FT,
} from "../../../util/UnitConversions";

type Props = { rowGap: number; imperial: boolean };

type State = {};

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = { selectedMotor: "NEO", currentLimit: 40 };
  render() {
    let config = this.context.model.document.robotConfig;
    let floorSpeed = config.wheelMaxVelocity * config.wheelRadius;
    let floorLinearForce = config.wheelMaxTorque / config.wheelRadius; // N
    let floorLinearAccel = floorLinearForce / config.mass;
    let driveRadius = Math.hypot(config.wheelbase / 2, config.trackWidth / 2);
    let chassisTorque = floorLinearForce * driveRadius; // N*m
    //N*m/(kg*m*m) = N/(kg*m) = (kg*m/s^2)/(kg*m)=1/s^2= rad/s^2
    let chassisAngularAccel = chassisTorque / config.rotationalInertia; //N*m/(kg*m*m) = N/(kg*m)
    let floorAngularVelocity =
      (config.wheelMaxVelocity * config.wheelRadius) / driveRadius;
    let imp = this.props.imperial;
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
          maxCharacters={8}
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
          maxCharacters={8}
          showCheckbox={false}
          titleTooltip="Linear maximum acceleration when not rotating"
        />
        <Input
          title="Ang Speed"
          suffix={`rad/s`}
          enabled={false}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={floorAngularVelocity}
          setNumber={() => null}
          maxCharacters={8}
          showCheckbox={false}
          titleTooltip="Maximum angular velocity when spinning in place"
        />

        <Input
          title="Ang Accel"
          suffix={`rad/s²`}
          enabled={false}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={chassisAngularAccel}
          setNumber={() => null}
          maxCharacters={8}
          showCheckbox={false}
          titleTooltip="Maximum angular acceleration when spinning in place"
        />
        {/* <Input
        title="Est. MOI"
        suffix={imp ? "lb · ft²" : "kg · m²"}
        enabled={false}
        setEnabled={(a) => null}
        number={
          ((imp ? KG_TO_LBS * M_TO_FT * M_TO_FT : 1) *
            (Math.pow(config.bumperLength - InToM(7), 2) +
              Math.pow(config.bumperWidth - InToM(7), 2)) *
            config.mass) /
          12
        }
        setNumber={() => {}}
        maxCharacters={8}
        showCheckbox={false}
        titleTooltip={
          "Rough MOI estimate based on mass and dimensions. For reference only"
        }
      /> */}
      </InputList>
    );
  }
}
export default observer(RobotConfigPanel);
