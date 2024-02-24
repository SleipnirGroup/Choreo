import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import InputList from "../../input/InputList";
import Input from "../../input/Input";
import { InToM, MetersOrInches, MToIn } from "../../../util/UnitConversions";

type Props = { rowGap: number; imperial: boolean };

type State = object;

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = { selectedMotor: "NEO", currentLimit: 40 };
  render() {
    const config = this.context.model.document.robotConfig;
    const imp = this.props.imperial;
    return (
      <InputList noCheckbox rowGap={this.props.rowGap}>
        <Input
          title="Wheel Radius"
          suffix={MetersOrInches(imp)}
          enabled={true}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={imp ? MToIn(config.wheelRadius) : config.wheelRadius}
          setNumber={(length) =>
            config!.setWheelRadius(imp ? InToM(length) : length)
          }
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Radius of swerve wheels"
        />
        <Input
          title="Gearing"
          suffix=": 1"
          enabled={true}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={config.gearing}
          setNumber={config!.setGearing}
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Gearing between motor shaft and wheel axle (>1)"
        />
        <Input
          title="Motor Max Speed"
          suffix="RPM"
          enabled={true}
          setEnabled={(a) => null}
          roundingPrecision={0}
          number={config.motorMaxVelocity}
          setNumber={config!.setMaxVelocity}
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Actual motor speed at 12V"
        />

        <Input
          title="Motor Max Torque"
          suffix="N · m"
          enabled={true}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={config.motorMaxTorque}
          setNumber={config!.setMaxTorque}
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Motor torque as current-limited"
        />
      </InputList>
    );
  }
}
export default observer(RobotConfigPanel);
