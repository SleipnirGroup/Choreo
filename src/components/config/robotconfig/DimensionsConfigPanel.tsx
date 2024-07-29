import { observer } from "mobx-react";
import React, { Component } from "react";
import {doc, uiState} from "../../../document/DocumentManager";
import InputList from "../../input/InputList";
import Input from "../../input/Input";
import {
  InToM,
  KgToLbs,
  KG_TO_LBS,
  LbsToKg,
  MassUnit,
  MetersOrInches,
  MToIn,
  M_TO_FT
} from "../../../util/UnitConversions";
import ExpressionInput from "../../input/ExpressionInput";
import ExpressionInputList from "../../input/ExpressionInputList";

type Props = { rowGap: number; };

type State = object;

class RobotConfigPanel extends Component<Props, State> {
  

  state = { selectedMotor: "NEO", currentLimit: 40 };
  render() {
    const config = doc.robotConfig;
    return (
      <ExpressionInputList rowGap={this.props.rowGap}>
        <ExpressionInput
          title="Mass"
          enabled={true}
          number={config.mass}
  
          maxWidthCharacters={8}
          titleTooltip={"Total robot mass"}
        />

        <ExpressionInput
          title="MOI"
          enabled={true}
          number={config.rotationalInertia}
          maxWidthCharacters={8}
          titleTooltip={"Robot moment of inertia around center vertical axis"}
        />

        <ExpressionInput
          title="Bumper Width"
          enabled={true}
          roundingPrecision={3}
          number={config.bumperWidth}
          maxWidthCharacters={8}
          titleTooltip="Width of robot with bumpers on"
        />

        <ExpressionInput
          title="Bumper Length"
          enabled={true}
          roundingPrecision={3}
          number={config.bumperLength}
          maxWidthCharacters={8}
          titleTooltip="Length of robot with bumpers on"
        />

        <ExpressionInput
          title="Wheelbase"
          enabled={true}
          roundingPrecision={3}
          number={config.wheelbase}
          maxWidthCharacters={8}
          titleTooltip="Front-back distance between wheel centers"
        />

        <ExpressionInput
          title="Trackwidth"
          enabled={true}
          roundingPrecision={3}
          number={config.trackWidth}
          maxWidthCharacters={8}
          titleTooltip="Left-right distance between wheel centers"
        />
      </ExpressionInputList>
    );
  }
}
export default observer(RobotConfigPanel);
