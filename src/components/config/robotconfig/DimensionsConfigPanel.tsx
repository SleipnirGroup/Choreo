import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../../document/DocumentManager";
import ExpressionInput from "../../input/ExpressionInput";
import ExpressionInputList from "../../input/ExpressionInputList";

type Props = { rowGap: number };

type State = object;

class RobotConfigPanel extends Component<Props, State> {
  state = { selectedMotor: "NEO", currentLimit: 40 };
  render() {
    const config = doc.robotConfig;
    const frontLeft = config.bumpers[0];
    const backLeft = config.bumpers[1];
    const backRight = config.bumpers[2];
    const frontRight = config.bumpers[3];
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
          number={config.inertia}
          maxWidthCharacters={8}
          titleTooltip={"Robot moment of inertia around center vertical axis"}
        />

        <ExpressionInput
          title="Bumper FL X"
          enabled={true}
          roundingPrecision={3}
          number={frontLeft.x}
          maxWidthCharacters={8}
          titleTooltip="Front-left bumper corner X"
        />

        <ExpressionInput
          title="Bumper FL Y"
          enabled={true}
          roundingPrecision={3}
          number={frontLeft.y}
          maxWidthCharacters={8}
          titleTooltip="Front-left bumper corner Y"
        />

        <ExpressionInput
          title="Bumper BL X"
          enabled={true}
          roundingPrecision={3}
          number={backLeft.x}
          maxWidthCharacters={8}
          titleTooltip="Back-left bumper corner X"
        />

        <ExpressionInput
          title="Bumper BL Y"
          enabled={true}
          roundingPrecision={3}
          number={backLeft.y}
          maxWidthCharacters={8}
          titleTooltip="Back-left bumper corner Y"
        />

        <ExpressionInput
          title="Bumper BR X"
          enabled={true}
          roundingPrecision={3}
          number={backRight.x}
          maxWidthCharacters={8}
          titleTooltip="Back-right bumper corner X"
        />

        <ExpressionInput
          title="Bumper BR Y"
          enabled={true}
          roundingPrecision={3}
          number={backRight.y}
          maxWidthCharacters={8}
          titleTooltip="Back-right bumper corner Y"
        />

        <ExpressionInput
          title="Bumper FR X"
          enabled={true}
          roundingPrecision={3}
          number={frontRight.x}
          maxWidthCharacters={8}
          titleTooltip="Front-right bumper corner X"
        />

        <ExpressionInput
          title="Bumper FR Y"
          enabled={true}
          roundingPrecision={3}
          number={frontRight.y}
          maxWidthCharacters={8}
          titleTooltip="Front-right bumper corner Y"
        />
      </ExpressionInputList>
    );
  }
}
export default observer(RobotConfigPanel);
