import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../../document/DocumentManager";
import ExpressionInput from "../../input/ExpressionInput";
import ExpressionInputList from "../../input/ExpressionInputList";

type Props = { rowGap: number };

type State = object;

class RobotConfigPanel extends Component<Props, State> {
  render() {
    const config = doc.robotConfig;
    return (
      <ExpressionInputList rowGap={this.props.rowGap}>
        <ExpressionInput
          title="Wheel Radius"
          enabled={true}
          roundingPrecision={3}
          number={config.radius}
          maxWidthCharacters={8}
          titleTooltip="Radius of swerve wheels"
        />
        <ExpressionInput
          title="Wheel COF"
          enabled={true}
          roundingPrecision={3}
          number={config.cof}
          maxWidthCharacters={8}
          titleTooltip="Coefficient of friction between wheel and ground"
        />
        <ExpressionInput
          title="Motor Rev/Wheel Rev"
          enabled={true}
          roundingPrecision={3}
          number={config.gearing}
          maxWidthCharacters={8}
          titleTooltip="Gearing between motor shaft and wheel axle (>1)"
        />
        <ExpressionInput
          title="Motor Max Speed"
          enabled={true}
          roundingPrecision={0}
          number={config.vmax}
          maxWidthCharacters={8}
          titleTooltip="Actual motor speed at 12V"
        />

        <ExpressionInput
          title="Motor Max Torque"
          enabled={true}
          roundingPrecision={3}
          number={config.tmax}
          maxWidthCharacters={8}
          titleTooltip="Motor torque as current-limited"
        />

        <ExpressionInput
          title="Motor Stall Torque"
          enabled={true}
          roundingPrecision={3}
          number={config.motor_config.stall_torque}
          maxWidthCharacters={8}
          titleTooltip="Motor stall torque as described by the datasheet or dyno values."
        />

        <ExpressionInput
          title="Free Speed"
          enabled={true}
          roundingPrecision={3}
          number={config.motor_config.free_speed}
          maxWidthCharacters={8}
          titleTooltip="Motor free speed as described by the datasheet or dyno values."
        />

        <ExpressionInput
          title="kT"
          enabled={true}
          roundingPrecision={20}
          number={config.motor_config.kT}
          maxWidthCharacters={20}
          titleTooltip="Motor kT as described by the datasheet or dyno values."
        />

        <ExpressionInput
          title="kV"
          enabled={true}
          roundingPrecision={20}
          number={config.motor_config.kV}
          maxWidthCharacters={20}
          titleTooltip="Motor kV as described by the datasheet or dyno values. (well not really on datasheet write a proper tooltip later)"
        />

        <ExpressionInput
          title="Supply Limit"
          enabled={true}
          roundingPrecision={0}
          number={config.motor_config.supply_limit}
          maxWidthCharacters={8}
          titleTooltip="The supply limit applied to the motor."
        />

        <ExpressionInput
          title="Stator Limit"
          enabled={true}
          roundingPrecision={0}
          number={config.motor_config.stator_limit}
          maxWidthCharacters={8}
          titleTooltip="The stator limit applied to the motor."
        />
      </ExpressionInputList>
    );
  }
}
export default observer(RobotConfigPanel);
