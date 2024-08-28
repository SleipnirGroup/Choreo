import { Divider, IconButton, Input, Switch, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../../document/DocumentManager";
import inputStyles from "../input/InputList.module.css";
import ExpressionInput from "../../input/ExpressionInput";
import { Add } from "@mui/icons-material";
import ExpressionInputList from "../../input/ExpressionInputList";
import { IExpressionStore, Units } from "../../../document/ExpressionStore";
import VariableRenamingInput from "./VariableRenamingInput";
import styles from "../../input/InputList.module.css"
import VariablesConfigPanel from "./VariablesConfigPanel";
import PoseVariablesConfigPanel from "./PoseVariablesConfigPanel";

type Props = object;

type State = { newVarName: string, newVarExpr: string };

class ExpressionsConfigPanel extends Component<Props, State> {
  state = { newVarName: "", newVarExpr: "", newVarUnit: Units.Meter }
  rowGap = 16;

  render() {
    const className = styles.InputList + " " + styles.Expression;
    doc.variables.expressions.keys();
    return (
      <div
        style={{
          minWidth: "600px",
          rowGap: `${0 * this.rowGap}px`,
          columnGap: this.rowGap,
          fontSize: "2rem",
          margin: `${1 * this.rowGap}px`,
          display: "flex",
          flexDirection:"column",
          overflow: "hidden"
        }}
      >
        <VariablesConfigPanel></VariablesConfigPanel>
        <Divider flexItem></Divider>
        <PoseVariablesConfigPanel></PoseVariablesConfigPanel>
      </div>
    );
  }
}
export default observer(ExpressionsConfigPanel);
