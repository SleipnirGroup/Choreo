import { Divider, IconButton, Input, Switch, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../../document/DocumentManager";
import inputStyles from "../input/InputList.module.css";
import ExpressionInput from "../../input/ExpressionInput";
import { Add } from "@mui/icons-material";
import ExpressionInputList from "../../input/ExpressionInputList";
import { Dimensions, IExpressionStore, Units } from "../../../document/ExpressionStore";
import VariableRenamingInput from "./VariableRenamingInput";
import styles from "../../input/InputList.module.css"
import VariablesConfigPanel, { GeneralVariableAddPanel } from "./VariablesConfigPanel";
import PoseVariablesConfigPanel from "./PoseVariablesConfigPanel";

type Props = object;

type State = object;

class ExpressionsConfigPanel extends Component<Props, State> {
  rowGap = 4;

  render() {
    doc.variables.expressions.keys();
    return (
      <div
        style={{
          rowGap: `${1 * this.rowGap}px`,
          columnGap: this.rowGap,
          fontSize: "1rem",
          margin: `${1 * this.rowGap}px`,
          display: "grid",
          gridTemplateColumns: "max-content max-content max-content max-content", width: "max-content"}}
      >
        <VariablesConfigPanel></VariablesConfigPanel>
        {doc.variables.expressions.size > 0 && <Divider sx={{ gridColumn: "1 / -1" }}></Divider>}
        <PoseVariablesConfigPanel></PoseVariablesConfigPanel>
        {doc.variables.poses.size > 0 && <Divider sx={{ gridColumn: "1 / -1" }}></Divider>}
        <GeneralVariableAddPanel></GeneralVariableAddPanel>
      </div>
    );
  }
}
export default observer(ExpressionsConfigPanel);
