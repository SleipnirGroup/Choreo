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

type Props = object;

type State = { imperial: boolean; bottomHalf: boolean };

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = { imperial: false, bottomHalf: false };
  rowGap = 16;
  render() {
    const imp = this.state.imperial;
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(300px, 1fr))",
          gridGap: `${2 * this.rowGap}px`,
          rowGap: `${0 * this.rowGap}px`,
          fontSize: "2rem",
          margin: `${1 * this.rowGap}px`
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
              justifyContent: "space-around"
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
            display: this.state.bottomHalf ? "block" : "block"
          }}
        >
          <Divider sx={{ color: "gray" }}>THEORETICAL</Divider>
          <FormHelperText
            sx={{
              textAlign: "center",
              display: this.state.bottomHalf ? "block" : "none"
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
            display: this.state.bottomHalf ? "block" : "block"
          }}
        >
          <Divider sx={{ color: "gray" }}>MOTOR CALCULATOR</Divider>
          <FormHelperText
            sx={{
              textAlign: "center",
              display: this.state.bottomHalf ? "block" : "none"
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
            justifyContent: "center"
          }}
        >
          <span style={{ height: "48px" }}>
            <IconButton
              sx={{
                transform: "translate(0%, calc(-50% + 12px))"
              }}
              onClick={() =>
                this.setState({ bottomHalf: !this.state.bottomHalf })
              }
            >
              {this.state.bottomHalf ? (
                <ArrowDropUp sx={{ fontSize: "3rem" }}></ArrowDropUp>
              ) : (
                <ArrowDropDown sx={{ fontSize: "3rem" }}></ArrowDropDown>
              )}
            </IconButton>
          </span>
        </div>
        {/* Motor Calculator */}
        <div
          style={{
            gridColumn: 2,
            gridRow: 3,
            display: this.state.bottomHalf ? "block" : "none"
          }}
        >
          <MotorCalculatorPanel rowGap={this.rowGap}></MotorCalculatorPanel>
        </div>
        <div
          style={{
            gridRow: 3,
            gridColumn: 1,
            pointerEvents: "none",
            display: this.state.bottomHalf ? "block" : "none",
            transform: `translate(${this.rowGap}px)`
          }}
        >
          <Divider orientation="vertical"></Divider>
        </div>
        {/* Theoreticals */}
        <div
          style={{
            gridColumn: 1,
            gridRow: 3,
            display: this.state.bottomHalf ? "block" : "none"
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
