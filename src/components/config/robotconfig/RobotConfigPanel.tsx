import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../../document/DocumentManager";
import MotorCalculatorPanel from "./MotorCalculatorPanel";
import inputStyles from "../../input/InputList.module.css";
import { Divider, FormHelperText, IconButton, Switch } from "@mui/material";
import { ArrowDropDown, ArrowDropUp } from "@mui/icons-material";
import DimensionsConfigPanel from "./DimensionsConfigPanel";
import TheoreticalPanel from "./TheoreticalPanel";
import ModuleConfigPanel from "./ModuleConfigPanel";

type Props = {};

type State = { imperial: boolean; bottomHalf: boolean };

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = { imperial: false, bottomHalf: false };
  rowGap = 16;
  render() {
    let config = this.context.model.document.robotConfig;
    let uiState = this.context.model.uiState;
    let imp = this.state.imperial;
    let floorSpeed = config.wheelMaxVelocity * config.wheelRadius;
    let floorLinearForce = config.wheelMaxTorque / config.wheelRadius; // N
    let floorLinearAccel = floorLinearForce / config.mass;
    let driveRadius = Math.hypot(config.wheelbase / 2, config.trackWidth / 2);
    let chassisTorque = floorLinearForce * driveRadius; // N*m
    //N*m/(kg*m*m) = N/(kg*m) = (kg*m/s^2)/(kg*m)=1/s^2= rad/s^2
    let chassisAngularAccel = chassisTorque / config.rotationalInertia; //N*m/(kg*m*m) = N/(kg*m)
    let floorAngularVelocity =
      (config.wheelMaxVelocity * config.wheelRadius) / driveRadius;
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(300px, 1fr))",
          gridGap: `${2 * this.rowGap}px`,
          rowGap: `${0 * this.rowGap}px`,
          fontSize: "2rem",
          margin: `${1 * this.rowGap}px`,
        }}
      >
        <div style={{ gridRow: 1, gridColumn: 1 }}>
          <Divider sx={{ color: "gray", marginBottom: `${this.rowGap}px` }}>
            DIMENSIONS
          </Divider>
          <DimensionsConfigPanel
            rowGap={this.rowGap}
            imperial={imp}
          ></DimensionsConfigPanel>
        </div>
        <div style={{ gridRow: 1, gridColumn: 2 }}>
          <Divider sx={{ color: "gray", marginBottom: `${this.rowGap}px` }}>
            DISPLAY
          </Divider>
          <div
            style={{
              height: 24,
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-around",
            }}
          >
            <span className={inputStyles.Title} style={{ gridColumn: "1" }}>
              Use Imperial Units
            </span>

            <Switch
              size="small"
              sx={{ gridColumn: 2 }}
              checked={this.state.imperial}
              onChange={(e, checked) => this.setState({ imperial: checked })}
            ></Switch>
          </div>
          <Divider sx={{ color: "gray", marginBlock: `${this.rowGap}px` }}>
            DRIVE MOTOR
          </Divider>
          <ModuleConfigPanel
            rowGap={this.rowGap}
            imperial={imp}
          ></ModuleConfigPanel>
        </div>
        {/* Left label divider when calculator is open */}
        <div
          style={{
            gridColumn: 1,
            gridRow: 2,
            display: this.state.bottomHalf ? "block" : "block",
          }}
        >
          <Divider sx={{ color: "gray" }}>THEORETICAL</Divider>
          <FormHelperText
            sx={{
              textAlign: "center",
              display: this.state.bottomHalf ? "block" : "none",
            }}
          >
            Calculated robot metrics, for reference and validation.
          </FormHelperText>
        </div>
        {/* Right label divider when calculator is open */}
        <div
          style={{
            gridColumn: 2,
            gridRow: 2,
            display: this.state.bottomHalf ? "block" : "block",
          }}
        >
          <Divider sx={{ color: "gray" }}>MOTOR CALCULATOR</Divider>
          <FormHelperText
            sx={{
              textAlign: "center",
              display: this.state.bottomHalf ? "block" : "none",
            }}
          >
            Select motor and current limit, then apply calculated motor
            parameters.
          </FormHelperText>
        </div>
        {/* Button to close calculator when calculator is open */}
        <div
          style={{
            gridColumn: "1/3",
            gridRow: 2,
            display: this.state.bottomHalf ? "flex" : "flex",
            justifyContent: "center",
          }}
        >
          <span style={{ height: "48px" }}>
            <IconButton
              sx={{ transform: "translate(0%, calc(-50% + 12px))" }}
              onClick={() =>
                this.setState({ bottomHalf: !this.state.bottomHalf })
              }
            >
              {this.state.bottomHalf ? (
                <ArrowDropUp fontSize="large"></ArrowDropUp>
              ) : (
                <ArrowDropDown fontSize="large"></ArrowDropDown>
              )}
            </IconButton>
          </span>
        </div>
        {/* Motor Calculator */}
        <div
          style={{
            gridColumn: 2,
            gridRow: 3,
            display: this.state.bottomHalf ? "block" : "none",
          }}
        >
          <MotorCalculatorPanel rowGap={this.rowGap}></MotorCalculatorPanel>
        </div>
        {/* Theoreticals */}
        <div
          style={{
            gridColumn: 1,
            gridRow: 3,
            display: this.state.bottomHalf ? "block" : "none",
          }}
        >
          <TheoreticalPanel
            rowGap={this.rowGap}
            imperial={imp}
          ></TheoreticalPanel>
        </div>
      </div>
    );
  }
}
export default observer(RobotConfigPanel);
