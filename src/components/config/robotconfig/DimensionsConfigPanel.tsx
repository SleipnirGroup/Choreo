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
          titleTooltip="Distance from robot center to front bumper edge"
        />

        <ExpressionInput
          title="Bumper Back"
          enabled={true}
          roundingPrecision={3}
          number={config.bumper.back}
          maxWidthCharacters={8}
          titleTooltip="Distance from robot center to back bumper edge"
        />

        <ExpressionInput
          title="Bumper Side"
          enabled={true}
          roundingPrecision={3}
          number={config.bumper.side}
          maxWidthCharacters={8}
          titleTooltip="Distance from robot center to bumper side edge"
        />
      </ExpressionInputList>
    );
  }
}
export default observer(RobotConfigPanel);
