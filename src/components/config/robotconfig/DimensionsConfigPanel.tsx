import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
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
          title="Mass"
          suffix={MassUnit(imp)}
          enabled={true}
          setEnabled={(a) => null}
          number={imp ? KgToLbs(config.mass) : config.mass}
          setNumber={(mass) => config!.setMass(imp ? LbsToKg(mass) : mass)}
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip={"Total robot mass"}
        />

        <Input
          title="MOI"
          suffix={imp ? "lb · ft²" : "kg · m²"}
          enabled={true}
          setEnabled={(a) => null}
          number={
            imp
              ? config.rotationalInertia * KG_TO_LBS * M_TO_FT * M_TO_FT
              : config.rotationalInertia
          }
          setNumber={(moi) =>
            config!.setRotationalInertia(
              imp ? moi / (KG_TO_LBS * M_TO_FT * M_TO_FT) : moi
            )
          }
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip={"Robot moment of inertia around center vertical axis"}
        />

        <Input
          title="Bumper Width"
          suffix={MetersOrInches(imp)}
          enabled={true}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={imp ? MToIn(config.bumperWidth) : config.bumperWidth}
          setNumber={(width) =>
            config!.setBumperWidth(imp ? InToM(width) : width)
          }
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Width of robot with bumpers on"
        />

        <Input
          title="Bumper Length"
          suffix={MetersOrInches(imp)}
          enabled={true}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={imp ? MToIn(config.bumperLength) : config.bumperLength}
          setNumber={(length) =>
            config!.setBumperLength(imp ? InToM(length) : length)
          }
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Length of robot with bumpers on"
        />

        <Input
          title="Wheelbase"
          suffix={MetersOrInches(imp)}
          enabled={true}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={imp ? MToIn(config.wheelbase) : config.wheelbase}
          setNumber={(wheelbase) =>
            config!.setWheelbase(imp ? InToM(wheelbase) : wheelbase)
          }
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Front-back distance between wheel centers"
        />

        <Input
          title="Trackwidth"
          suffix={MetersOrInches(imp)}
          enabled={true}
          setEnabled={(a) => null}
          roundingPrecision={3}
          number={imp ? MToIn(config.trackWidth) : config.trackWidth}
          setNumber={(trackwidth) =>
            config!.setTrackwidth(imp ? InToM(trackwidth) : trackwidth)
          }
          maxWidthCharacters={8}
          showCheckbox={false}
          titleTooltip="Left-right distance between wheel centers"
        />
        {/* An extra invisible element to keep the list width from shrinking when switching to imperial units */}
        <span style={{ color: "transparent", height: 0, gridColumn: 1 }}>
          Floor Speed
        </span>
        <span style={{ color: "transparent", height: 0, gridColumn: 3 }}>
          kg · m²
        </span>
      </InputList>
    );
  }
}
export default observer(RobotConfigPanel);
