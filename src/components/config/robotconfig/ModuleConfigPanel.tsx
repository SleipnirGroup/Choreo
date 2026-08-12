import { observer } from "mobx-react";
import { Checkbox, FormControlLabel } from "@mui/material";
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
          title="Motor Speed Limit"
          enabled={true}
          roundingPrecision={0}
          number={config.vmax}
          maxWidthCharacters={8}
          titleTooltip="Planner motor speed limit (typically 80% of free speed)"
        />

        <ExpressionInput
          title="Motor Max Torque"
          enabled={true}
          roundingPrecision={3}
          number={config.tmax}
          maxWidthCharacters={8}
          titleTooltip="Motor torque as current-limited"
        />
        <FormControlLabel
          sx={{ gridColumn: "1 / 3", justifySelf: "end", marginRight: 0 }}
          control={
            <Checkbox
              size="small"
              checked={config.motorCurveEnabled}
              onChange={(_, enabled) => config.setMotorCurveEnabled(enabled)}
            />
          }
          label="Use torque-speed curve"
        />
        <ExpressionInput
          title="Motor Free Speed"
          enabled={config.motorCurveEnabled}
          roundingPrecision={0}
          number={config.motorFreeSpeed}
          maxWidthCharacters={8}
          titleTooltip="Physical no-load motor speed at nominal voltage"
        />
        <ExpressionInput
          title="Motor Stall Torque"
          enabled={config.motorCurveEnabled}
          roundingPrecision={3}
          number={config.motorStallTorque}
          maxWidthCharacters={8}
          titleTooltip="Physical motor stall torque at nominal voltage"
        />
      </ExpressionInputList>
    );
  }
}
export default observer(RobotConfigPanel);
