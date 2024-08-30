import { Divider, IconButton, Input, MenuItem, Select, SelectChangeEvent, Switch, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../../document/DocumentManager";
import inputStyles from "../input/InputList.module.css";
import ExpressionInput from "../../input/ExpressionInput";
import { Add, Delete } from "@mui/icons-material";
import ExpressionInputList from "../../input/ExpressionInputList";
import { Dimensions, IExpressionStore, Units } from "../../../document/ExpressionStore";
import VariableRenamingInput from "./VariableRenamingInput";
import styles from "../../input/InputList.module.css"

type Props = object;

type State = { newVarName: string, newVarExpr: string, newVarUnit: keyof typeof Dimensions };


class VariablesConfigPanel extends Component<Props, State> {
  state = { newVarName: "", newVarExpr: "", newVarUnit: "Length" as keyof typeof Dimensions }
  rowGap = 16;
  localExpression = doc.variables.createExpression("0 m", Dimensions[this.state.newVarUnit])
  render() {
    const className = styles.InputList + " " + styles.Expression;
    doc.variables.expressions.keys();
    return (

        <div className={className} style={{ gridTemplateColumns: "max-content auto max-content", overflowY: "scroll", overflowX: "hidden", width:"max-content"}}>
          {
            Array.from(doc.variables.expressions.entries()).map((entry) => <><ExpressionInput key={`${entry[0]}-expr`}
              enabled
              // title={entry[0]}
              title={() =>
                <VariableRenamingInput name={entry[0]} setName={name=>doc.variables.renameExpression(entry[0], name)}></VariableRenamingInput>
              }
              number={entry[1]}
            ></ExpressionInput><Delete onClick={()=>doc.variables.deleteExpression(entry[0])}></Delete></>)}
            <Divider sx={{gridColumn:"1 / -1"}}></Divider>
          <>
          <ExpressionInput key={`varadd-expr`}
              enabled
              // title={entry[0]}
              title={() =>
                <VariableRenamingInput name={this.state.newVarName} setName={name=>this.setState({newVarName: name})}></VariableRenamingInput>
              }
              number={this.localExpression}
            ></ExpressionInput>
          <Select size="small" value={this.state.newVarUnit} onChange={(e: SelectChangeEvent<keyof typeof Dimensions>)=>{
            this.setState({newVarUnit: e.target.value as keyof typeof Dimensions});
            this.localExpression.setDefaultUnit(Dimensions[e.target.value as keyof typeof Dimensions].unit);
          }}>
            {Object.entries(Dimensions).map(entry=> (
              <MenuItem value={entry[0]}>{entry[1].name}</MenuItem>
            ))}
          </Select>
            <IconButton size="small" onClick={_ => {
              let { newVarName, newVarExpr, newVarUnit } = this.state;
              doc.variables.add(newVarName, this.localExpression.serialize, this.localExpression.defaultUnit);
            }}>
              <Add></Add>
            </IconButton>
          </>
        </div>
    );
  }
}
export default observer(VariablesConfigPanel);
