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
        {doc.type === "Swerve" ? (
          <>
            <ExpressionInput
              title="Front Mod X"
              enabled={true}
              roundingPrecision={3}
              number={config.frontLeft.x}
              maxWidthCharacters={8}
              titleTooltip="X coordinate of front modules"
            />

            <ExpressionInput
              title="Front Left Y"
              enabled={true}
              roundingPrecision={3}
              number={config.frontLeft.y}
              maxWidthCharacters={8}
              titleTooltip="Y coordinate of front left module"
            />
            <ExpressionInput
              title="Back Mod X"
              enabled={true}
              roundingPrecision={3}
              number={config.backLeft.x}
              maxWidthCharacters={8}
              titleTooltip="X coordinate of back modules (negative)"
            />

            <ExpressionInput
              title="Back Left Y"
              enabled={true}
              roundingPrecision={3}
              number={config.backLeft.y}
              maxWidthCharacters={8}
              titleTooltip="Y coordinate of back left module"
            />
          </>
        ) : (
          <ExpressionInput
            title="Trackwidth"
            enabled={true}
            roundingPrecision={3}
            number={config.differentialTrackWidth}
            maxWidthCharacters={8}
            titleTooltip="Distance between wheel sides"
          />
        )}
      </ExpressionInputList>
    );
  }
}
export default observer(RobotConfigPanel);
