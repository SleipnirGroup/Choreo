import {
  Autocomplete,
  Divider,
  FormHelperText,
  TextField
} from "@mui/material";
import { observer } from "mobx-react";
import { Component } from "react";
import DimensionsConfigPanel from "./DimensionsConfigPanel";
import ModuleConfigPanel from "./ModuleConfigPanel";
import TheoreticalPanel from "./TheoreticalPanel";
import { doc } from "../../../document/DocumentManager";
import DifferentialConfigPanel from "./DifferentialConfigPanel";
import SwerveConfigPanel from "./SwerveConfigPanel";
import MecanumConfigPanel from "./MecanumConfigPanel";

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
          <Divider sx={{ color: "gray" }}>DRIVE TYPE</Divider>
          <div
            style={{
              height: `${this.rowGap * 2}`,
              flex: 1,
              marginBottom: `${this.rowGap}px`
            }}
          >
            <Autocomplete
              size="small"
              value={doc.type}
              onChange={(_e, new_value) =>
                doc.setType(new_value as "Differential" | "Mecanum" | "Swerve")
              }
              options={["Swerve", "Mecanum", "Differential"]}
              disableClearable={true}
              renderInput={(params) => <TextField {...params} label="" />}
            ></Autocomplete>
          </div>
          {doc.type === "Differential" ? (
            <DifferentialConfigPanel
              rowGap={this.rowGap}
            ></DifferentialConfigPanel>
          ) : doc.type === "Swerve" ? (
            <SwerveConfigPanel rowGap={this.rowGap}></SwerveConfigPanel>
          ) : (
            <MecanumConfigPanel rowGap={this.rowGap}></MecanumConfigPanel>
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
