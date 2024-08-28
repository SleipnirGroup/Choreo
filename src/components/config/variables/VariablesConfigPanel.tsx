import { IconButton, Input, Switch, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../../document/DocumentManager";
import inputStyles from "../input/InputList.module.css";
import ExpressionInput from "../../input/ExpressionInput";
import { Add } from "@mui/icons-material";
import ExpressionInputList from "../../input/ExpressionInputList";
import { IExpressionStore, Units } from "../../../document/ExpressionStore";

type Props = object;

type State = { newVarName: string, newVarExpr: string };

class VariablesConfigPanel extends Component<Props, State> {
  state = { newVarName: "", newVarExpr: "", newVarUnit: Units.Meter }
  rowGap = 16;
  render() {
    doc.variables.expressions.keys();
    return (
      <div
        style={{
          minWidth: "600px",
          rowGap: `${0 * this.rowGap}px`,
          fontSize: "2rem",
          margin: `${1 * this.rowGap}px`
        }}
      >
        <ExpressionInputList>
          {
            Array.from(doc.variables.expressions.entries()).map((entry)=> <ExpressionInput
              enabled
              title={""}
              // title={observer(() =>
              //   <Input type="text" onSubmit={e => {
              //     let newName = e.currentTarget.nodeValue;
              //     if (newName !== null) {
              //       doc.variables.expressions.set(newName, entry[1]);
              //     }
              //   }}>

              //   </Input>)}
              number={entry[1]}
            ></ExpressionInput>)}
          <Input type="text"
            onChange={e => this.setState({ newVarName: e.currentTarget.value ?? "" })}
          ></Input>
          <>
            <Input type="text"
              onChange={e => this.setState({ newVarExpr: e.currentTarget.value ?? "" })}
            ></Input>
            <IconButton onClick={_ => {
              let { newVarName, newVarExpr, newVarUnit} = this.state;
              doc.variables.add(newVarName, newVarExpr, newVarUnit);
              console.log(doc.variables.serialize())
            }}>
              <Add></Add>
            </IconButton>
          </>
        </ExpressionInputList>

      </div>
    );
  }
}
export default observer(VariablesConfigPanel);
