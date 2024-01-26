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
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(300px, 1fr))",
          gridGap: `${2 * this.rowGap}px`,
          rowGap: `${0 * this.rowGap}px`,
          fontSize: "2rem",
          margin: `${1 * this.rowGap}px`,
        }}
      >
        <span className={inputStyles.Title} style={{ gridColumn: "1" }}>
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
    );
  }
}
export default observer(BetasConfigPanel);
