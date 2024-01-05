import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import InputList from "../../input/InputList";
import Input from "../../input/Input";
import { InToM, MetersOrInches, MToIn } from "../../../util/UnitConversions";

type Props = { rowGap: number; imperial: boolean };

type State = {};

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = { selectedMotor: "NEO", currentLimit: 40 };
  render() {
    let config = this.context.model.document.robotConfig;
    let imp = this.props.imperial;
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
          maxCharacters={8}
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
          maxCharacters={8}
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
          maxCharacters={8}
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
          maxCharacters={8}
          showCheckbox={false}
          titleTooltip="Motor torque as current-limited"
        />
      </InputList>
    );
  }
}
export default observer(RobotConfigPanel);
