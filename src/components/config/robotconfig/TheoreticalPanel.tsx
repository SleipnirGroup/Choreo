import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../../document/DocumentManager";
import Input from "../../input/Input";
import InputList from "../../input/InputList";

import { MetersOrFeet, MToFt } from "../../../util/UnitConversions";

type Props = { rowGap: number; imperial: boolean };

type State = object;

class RobotConfigPanel extends Component<Props, State> {
  state = { selectedMotor: "NEO", currentLimit: 40 };
  render() {
    const config = doc.robotConfig.snapshot;
    const floorSpeed = doc.robotConfig.wheelMaxVelocity * config.radius;
    const motorFloorLinearForce =
      (4 * doc.robotConfig.wheelMaxTorque) / config.radius; // N
    const motorFloorLinearAccel = motorFloorLinearForce / config.mass;

    const frictionFloorLinearAccel = 9.81 * config.cof;
    const frictionFloorLinearForce = config.mass * frictionFloorLinearAccel;
    const minimumLinearForce = Math.min(
      motorFloorLinearForce,
      frictionFloorLinearForce
    );

    const floorLinearAccel = minimumLinearForce / config.mass;
    const driveRadius = Math.hypot(config.frontLeft.x, config.frontLeft.y); // TODO proper sum of forces from four wheels
    const chassisTorque = minimumLinearForce * driveRadius; // N*m
    //N*m/(kg*m*m) = N/(kg*m) = (kg*m/s^2)/(kg*m)=1/s^2= rad/s^2
    const chassisAngularAccel = chassisTorque / config.inertia; //N*m/(kg*m*m) = N/(kg*m)
    const floorAngularVelocity =
      (doc.robotConfig.wheelMaxVelocity * config.radius) / driveRadius;
    const imp = this.props.imperial;
    return (
      <>
        <div
          style={{
            gridColumn: 1
          }}
        >
          <InputList noCheckbox rowGap={this.props.rowGap}>
            <Input
              title="Traction Accel Limit"
              suffix={`${MetersOrFeet(imp)}/s^2`}
              enabled={false}
              setEnabled={(_) => null}
              roundingPrecision={3}
              number={
                imp ? MToFt(frictionFloorLinearAccel) : frictionFloorLinearAccel
              }
              setNumber={() => null}
              showCheckbox={false}
              titleTooltip="Maximum acceleration without wheel slip"
            />
            <Input
              title="Motor Accel Limit"
              suffix={`${MetersOrFeet(imp)}/s²`}
              enabled={false}
              setEnabled={(_) => null}
              roundingPrecision={3}
              number={
                imp ? MToFt(motorFloorLinearAccel) : motorFloorLinearAccel
              }
              setNumber={() => null}
              showCheckbox={false}
              titleTooltip="Maximum acceleration based on motor torque"
            />
          </InputList>
        </div>
        <div
          style={{
            gridColumn: 2
          }}
        >
          <InputList noCheckbox rowGap={this.props.rowGap}>
            <Input
              title="Floor Speed"
              suffix={`${MetersOrFeet(imp)}/s`}
              enabled={false}
              setEnabled={(_) => null}
              roundingPrecision={3}
              number={imp ? MToFt(floorSpeed) : floorSpeed}
              setNumber={() => null}
              showCheckbox={false}
              titleTooltip="Linear maximum speed when not rotating"
            />
            <Input
              title="Floor Accel"
              suffix={`${MetersOrFeet(imp)}/s²`}
              enabled={false}
              setEnabled={(_) => null}
              roundingPrecision={3}
              number={imp ? MToFt(floorLinearAccel) : floorLinearAccel}
              setNumber={() => null}
              showCheckbox={false}
              titleTooltip="Effective linear maximum acceleration when not rotating"
            />
          </InputList>
        </div>
        <div
          style={{
            gridColumn: 3
          }}
        >
          <InputList noCheckbox rowGap={this.props.rowGap}>
            <Input
              title="Ang Speed"
              suffix={"rad/s"}
              enabled={false}
              setEnabled={(_) => null}
              roundingPrecision={3}
              number={floorAngularVelocity}
              setNumber={() => null}
              showCheckbox={false}
              titleTooltip="Maximum angular speed when spinning in place"
            />

            <Input
              title="Ang Accel"
              suffix={"rad/s²"}
              enabled={false}
              setEnabled={(_) => null}
              roundingPrecision={3}
              number={chassisAngularAccel}
              setNumber={() => null}
              showCheckbox={false}
              titleTooltip="Effective maximum angular acceleration when spinning in place"
            />
          </InputList>
        </div>
      </>
    );
  }
}
export default observer(RobotConfigPanel);
