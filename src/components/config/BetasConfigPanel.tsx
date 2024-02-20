import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import MotorCalculatorPanel from "./robotconfig/MotorCalculatorPanel";
import inputStyles from "../input/InputList.module.css";
import {
  Divider,
  FormHelperText,
  IconButton,
  Switch,
  Tooltip,
} from "@mui/material";
import { ArrowDropDown, ArrowDropUp, Warning } from "@mui/icons-material";
import DimensionsConfigPanel from "./robotconfig/DimensionsConfigPanel";
import TheoreticalPanel from "./robotconfig/TheoreticalPanel";
import ModuleConfigPanel from "./robotconfig/ModuleConfigPanel";

type Props = {};

type State = {};

class BetasConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  rowGap = 16;
  render() {
    return (
      <div
        style={{
          minWidth: `600px`,
          fontSize: "2rem",
          marginTop: `${1 * this.rowGap}px`,
          marginBottom: `${1 * this.rowGap}px`,
          marginRight: 0,
        }}
      >
        <div
          style={{
            marginLeft: `${1 * this.rowGap}px`,
            marginRight: `${1 * this.rowGap}px`,
          }}
        >
          <span
            className={inputStyles.Title}
            style={{ display: "flex", gap: "4px" }}
          >
            <Warning></Warning>
            Warning: these features are still under development and may be
            unstable
          </span>
        </div>
        <Divider style={{ margin: `${1 * this.rowGap}px` }}></Divider>
        <div
          style={{
            marginLeft: `${1 * this.rowGap}px`,
            marginRight: `${1 * this.rowGap}px`,
          }}
        >
          <span
            className={inputStyles.Title}
            style={{ verticalAlign: "middle" }}
          >
            Enable obstacles in the UI
          </span>
          <Tooltip
            title={
              "Warning: obstacles are still under development and may be unstable."
            }
          >
            <Switch
              size="small"
              sx={{ gridColumn: 2 }}
              checked={this.context.model.document.usesObstacles}
              onChange={(e, checked) => {
                this.context.model.setUsesObstacles(checked);
              }}
            ></Switch>
          </Tooltip>
        </div>
      </div>
    );
  }
}
export default observer(BetasConfigPanel);
