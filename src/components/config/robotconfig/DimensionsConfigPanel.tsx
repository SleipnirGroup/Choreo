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
          title="Bumper Front"
          enabled={true}
          roundingPrecision={3}
          number={config.bumper.front}
          maxWidthCharacters={8}
          titleTooltip="Width of robot with bumpers on"
        />

        <ExpressionInput
          title="Bumper Back"
          enabled={true}
          roundingPrecision={3}
          number={config.bumper.back}
          maxWidthCharacters={8}
          titleTooltip="Length of robot with bumpers on"
        />

        <ExpressionInput
          title="Bumper Left"
          enabled={true}
          roundingPrecision={3}
          number={config.bumper.left}
          maxWidthCharacters={8}
          titleTooltip="Width of robot with bumpers on"
        />

        <ExpressionInput
          title="Bumper Right"
          enabled={true}
          roundingPrecision={3}
          number={config.bumper.right}
          maxWidthCharacters={8}
          titleTooltip="Length of robot with bumpers on"
        />

        <ExpressionInput
          title="FL.X"
          enabled={true}
          roundingPrecision={3}
          number={config.modules[0].x}
          maxWidthCharacters={8}
          titleTooltip="Front-back distance between wheel centers"
        />

        <ExpressionInput
          title="FL.Y"
          enabled={true}
          roundingPrecision={3}
          number={config.modules[0].y}
          maxWidthCharacters={8}
          titleTooltip="Front-back distance between wheel centers"
        />
        <ExpressionInput
          title="BL.X"
          enabled={true}
          roundingPrecision={3}
          number={config.modules[1].x}
          maxWidthCharacters={8}
          titleTooltip="Front-back distance between wheel centers"
        />

        <ExpressionInput
          title="BL.Y"
          enabled={true}
          roundingPrecision={3}
          number={config.modules[1].y}
          maxWidthCharacters={8}
          titleTooltip="Front-back distance between wheel centers"
        />
        <ExpressionInput
          title="BR.X"
          enabled={true}
          roundingPrecision={3}
          number={config.modules[2].x}
          maxWidthCharacters={8}
          titleTooltip="Front-back distance between wheel centers"
        />

        <ExpressionInput
          title="BR.Y"
          enabled={true}
          roundingPrecision={3}
          number={config.modules[2].y}
          maxWidthCharacters={8}
          titleTooltip="Front-back distance between wheel centers"
        />
        <ExpressionInput
          title="FR.X"
          enabled={true}
          roundingPrecision={3}
          number={config.modules[3].x}
          maxWidthCharacters={8}
          titleTooltip="Front-back distance between wheel centers"
        />

        <ExpressionInput
          title="FR.Y"
          enabled={true}
          roundingPrecision={3}
          number={config.modules[3].y}
          maxWidthCharacters={8}
          titleTooltip="Front-back distance between wheel centers"
        />
      </ExpressionInputList>
    );
  }
}
export default observer(RobotConfigPanel);
