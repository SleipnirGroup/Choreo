import { observer } from "mobx-react";
import React, { Component } from "react";
import {doc, uiState} from "../../../document/DocumentManager";
import InputList from "../../input/InputList";
import Input from "../../input/Input";
import { InToM, MetersOrInches, MToIn } from "../../../util/UnitConversions";
import ExpressionInput from "../../input/ExpressionInput";
import ExpressionInputList from "../../input/ExpressionInputList";

type Props = { rowGap: number; };

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
          number={config.wheelRadius}
          maxWidthCharacters={8}
          titleTooltip="Radius of swerve wheels"
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
          number={config.motorMaxVelocity}
          maxWidthCharacters={8}
          titleTooltip="Actual motor speed at 12V"
        />

        <ExpressionInput
          title="Motor Max Torque"
          enabled={true}
          roundingPrecision={3}
          number={config.motorMaxTorque}
          maxWidthCharacters={8}
          titleTooltip="Motor torque as current-limited"
        />
      </ExpressionInputList>
    );
  }
}
export default observer(RobotConfigPanel);
