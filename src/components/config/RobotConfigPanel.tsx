import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import InputList from "../input/InputList";
import Input from "../input/Input";
import GearboxConfigPanel from "./GearboxConfigPanel";
import { Divider, FormControl, FormControlLabel, Switch } from "@mui/material";
import { InToM, KgToLbs, KG_TO_LBS, LbsToKg, MassUnit, MetersOrFeet, MetersOrInches, MToFt, MToIn, M_TO_FT } from "../../util/UnitConversions";

type Props = {};

type State = {imperial:boolean};

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {imperial:false};
  render() {
    let config = this.context.model.document.robotConfig;
    let uiState = this.context.model.uiState;
    let imp = this.state.imperial;
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "min-content min-content",
          gridGap: "8px",
        }}
      >
        <div>
          <InputList noCheckbox>
            
            <Input
              title="Mass"
              suffix={MassUnit(imp)}
              enabled={true}
              setEnabled={(a) => null}
              number={KgToLbs(imp, config.mass)}
              setNumber={(mass)=>config!.setMass(LbsToKg(imp, mass))}
              maxCharacters={8}
              showCheckbox={false}
              titleTooltip={"Total robot mass"}
            />

            <Input
              title="MOI"
              suffix={this.state.imperial ? "lb · ft²":  "kg · m²"}
              enabled={true}
              setEnabled={(a) => null}
              number={this.state.imperial ? config.rotationalInertia * KG_TO_LBS * M_TO_FT * M_TO_FT : config.rotationalInertia}
              setNumber={(moi)=>config!.setRotationalInertia(
                this.state.imperial ? moi / (KG_TO_LBS * M_TO_FT * M_TO_FT) : moi
              )}
              maxCharacters={8}
              showCheckbox={false}
              titleTooltip={
                "Robot moment of inertia around center vertical axis"
              }
            />

            <Input
              title="Width"
              suffix={MetersOrInches(imp)}
              enabled={true}
              setEnabled={(a) => null}
              roundingPrecision={3}
              number={MToIn(imp, config.bumperWidth)}
              setNumber={(width)=>config!.setBumperWidth(InToM(imp, width))}
              maxCharacters={8}
              showCheckbox={false}
              titleTooltip="Width of robot with bumpers on"
            />

            <Input
              title="Length"
              suffix={MetersOrInches(imp)}
              enabled={true}
              setEnabled={(a) => null}
              roundingPrecision={3}
              number={MToIn(imp, config.bumperLength)}
              setNumber={(length)=>config!.setBumperLength(InToM(imp, length))}
              maxCharacters={8}
              showCheckbox={false}
              titleTooltip="Length of robot with bumpers on"
            />

            <Input
              title="Wheelbase"
              suffix={MetersOrInches(imp)}
              enabled={true}
              setEnabled={(a) => null}
              roundingPrecision={3}
              number={MToIn(imp, config.wheelbase)}
              setNumber={(length)=>config!.setWheelbase(InToM(imp, length))}
              maxCharacters={8}
              showCheckbox={false}
              titleTooltip="Front-back distance between wheel centers"
            />

            <Input
              title="Trackwidth"
              suffix={MetersOrInches(imp)}
              enabled={true}
              setEnabled={(a) => null}
              roundingPrecision={3}
              number={MToIn(imp, config.trackWidth)}
              setNumber={(length)=>config!.setTrackwidth(InToM(imp, length))}
              maxCharacters={8}
              showCheckbox={false}
              titleTooltip="Left-right distance between wheel centers"
            />
            {/* An extra invisible element to keep the list width from shrinking when switching to imperial units */}
            <span style={{ color:"transparent", height:0, gridColumn: 3}}>kg · m²</span>
          </InputList>
        </div>
        <div>
          <InputList noCheckbox>
            <Input
              title="Motor Free Speed"
              suffix="RPM"
              enabled={true}
              setEnabled={(a) => null}
              roundingPrecision={0}
              number={config.motorMaxVelocity}
              setNumber={config!.setMaxVelocity}
              maxCharacters={8}
              showCheckbox={false}
              titleTooltip="Motor speed with no load"
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
              title="Wheel Radius"
              suffix={MetersOrInches(imp)}
              enabled={true}
              setEnabled={(a) => null}
              roundingPrecision={3}
              number={MToIn(imp, config.wheelRadius)}
              setNumber={(length)=>config!.setWheelRadius(InToM(imp, length))}
              maxCharacters={8}
              showCheckbox={false}
              titleTooltip="Radius of swerve wheels"
            />
            <Input
              title="Floor Speed"
              suffix={`${MetersOrFeet(imp)}/s`}
              enabled={false}
              setEnabled={(a) => null}
              roundingPrecision={3}
              number={MToFt(imp, config.wheelMaxVelocity * config.wheelRadius)}
              setNumber={() => null}
              maxCharacters={8}
              showCheckbox={false}
              titleTooltip="Linear maximum speed when not rotating"
            />
            <Input
              title="Floor Accel"
              suffix={`${MetersOrFeet(imp)}/s²`}
              enabled={false}
              setEnabled={(a) => null}
              roundingPrecision={3}
              number={
                MToFt(imp,
                config.wheelMaxTorque / // N*m = (kg)(m^2)/(s^2)
                config.mass /
                config.wheelRadius
                )
              }
              setNumber={() => null}
              maxCharacters={8}
              showCheckbox={false}
              titleTooltip="Linear maximum acceleration when not rotating"
            />
          </InputList>
        </div>
        <Divider style={{ gridRow: 2, gridColumn: "1/3" }}></Divider>
        <div style={{ gridColumn: 2, gridRow:3, width:"80%", margin:"auto"}}>
          <GearboxConfigPanel></GearboxConfigPanel>
        </div>
        <div style={{ gridColumn: 1, gridRow:3, width:"90%", margin:"auto", textAlign:"center" }}>
          <FormControl>
          <FormControlLabel
          value="right"
          control={ <Switch checked={this.state.imperial} onChange={(e, checked)=>this.setState({imperial:checked})}></Switch>}
          label="Use Imperial Units"
          labelPlacement="start"
        />
          </FormControl>
          Box-model MOI = {(Math.pow(config.bumperLength - InToM(true, 7), 2) + Math.pow(config.bumperWidth - InToM(true, 7), 2)) * config.mass/12}

        </div>
      </div>
    );
  }
}
export default observer(RobotConfigPanel);
