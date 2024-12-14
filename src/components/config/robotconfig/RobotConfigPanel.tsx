import { Divider, FormHelperText, Switch } from "@mui/material";
import { observer } from "mobx-react";
import { Component } from "react";
import inputStyles from "../../input/InputList.module.css";
import DimensionsConfigPanel from "./DimensionsConfigPanel";
import ModuleConfigPanel from "./ModuleConfigPanel";
import TheoreticalPanel from "./TheoreticalPanel";
import { doc } from "../../../document/DocumentManager";
import DifferentialConfigPanel from "./DifferentialConfigPanel";
import SwerveConfigPanel from "./SwerveConfigPanel";

type Props = object;

type State = { imperial: boolean; bottomHalf: boolean };

class RobotConfigPanel extends Component<Props, State> {
  state = { imperial: false, bottomHalf: false };
  rowGap = 16;
  render() {
    const imp = this.state.imperial;
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(275px, 1fr))",
          gridGap: `${2 * this.rowGap}px`,
          rowGap: `${1 * this.rowGap}px`,
          fontSize: "2rem",
          margin: `${1 * this.rowGap}px`
        }}
      >
        {/* Left Column */}
        <div style={{ gridRow: 1, gridColumn: 1 }}>
          <Divider sx={{ color: "gray", marginBottom: `${this.rowGap}px` }}>
            DIMENSIONS
          </Divider>
          <DimensionsConfigPanel rowGap={this.rowGap}></DimensionsConfigPanel>
        </div>
        {/* Middle Column */}
        <div style={{ gridRow: 1, gridColumn: 2 }}>
          <Divider sx={{ color: "gray", marginBottom: `${this.rowGap}px` }}>
            DRIVE MOTOR
          </Divider>
          <ModuleConfigPanel rowGap={this.rowGap}></ModuleConfigPanel>
        </div>
        {/* Right Column */}
        <div
          style={{
            gridColumn: 3,
            gridRow: 1
          }}
        >
          <Divider sx={{ color: "gray", marginBottom: `${this.rowGap}px` }}>
            DRIVE TYPE
          </Divider>
          <div
            style={{
              height: 24,
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-evenly",
              marginBottom: `${this.rowGap}px`
            }}
          >
            <span className={inputStyles.Title} style={{ gridColumn: "1" }}>
              Swerve
            </span>

            <Switch
              size="small"
              sx={{
                gridColumn: 2,
                ".MuiSwitch-track": { backgroundColor: "black" },
                ".Mui-checked+.MuiSwitch-track": { backgroundColor: "black" }
              }}
              checked={doc.type === "Differential"}
              onChange={(_e, checked) =>
                doc.setType(checked ? "Differential" : "Swerve")
              }
            ></Switch>
            <span className={inputStyles.Title} style={{ gridColumn: "1" }}>
              Differential
            </span>
          </div>
          {doc.type === "Differential" ? (
            <DifferentialConfigPanel
              rowGap={this.rowGap}
            ></DifferentialConfigPanel>
          ) : (
            <SwerveConfigPanel rowGap={this.rowGap}></SwerveConfigPanel>
          )}
        </div>
        {/* Theoreticals */}
        <div
          style={{
            gridColumn: "1 / 4",
            gridRow: 2
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
        <TheoreticalPanel
          rowGap={this.rowGap}
          imperial={imp}
        ></TheoreticalPanel>
      </div>
    );
  }
}
export default observer(RobotConfigPanel);
