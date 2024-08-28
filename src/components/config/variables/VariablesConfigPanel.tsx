import { IconButton, Input, Switch, Tooltip } from "@mui/material";
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

type Props = object;

type State = { newVarName: string, newVarExpr: string };

class VariablesConfigPanel extends Component<Props, State> {
  state = { newVarName: "", newVarExpr: "", newVarUnit: Units.Meter }
  rowGap = 16;
  render() {
    const className = styles.InputList + " " + styles.Expression;
    doc.variables.expressions.keys();
    return (

        <div className={className} style={{ gridTemplateColumns: "10ch auto max-content", overflowY: "scroll", overflowX: "hidden"}}>
          {
            Array.from(doc.variables.expressions.entries()).map((entry) => <><ExpressionInput
              enabled
              //title={""}
              title={() =>
                <VariableRenamingInput name={entry[0]} setName={name=>doc.variables.renameExpression(entry[0], name)}></VariableRenamingInput>
              }
              number={entry[1]}
            ></ExpressionInput><span></span></>)}
          <Input type="text"
            onChange={e => this.setState({ newVarName: e.currentTarget.value ?? "" })}
          ></Input>
          <>
            <Input type="text"
              onChange={e => this.setState({ newVarExpr: e.currentTarget.value ?? "" })}
            ></Input>
            <IconButton onClick={_ => {
              let { newVarName, newVarExpr, newVarUnit } = this.state;
              doc.variables.add(newVarName, newVarExpr, newVarUnit);
            }}>
              <Add></Add>
            </IconButton>
          </>
        </div>
    );
  }
}
export default observer(VariablesConfigPanel);
