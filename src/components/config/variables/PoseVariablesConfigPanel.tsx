import { Divider, IconButton, Input, Switch, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { Component } from "react";
import { Env, doc } from "../../../document/DocumentManager";
import inputStyles from "../input/InputList.module.css";
import ExpressionInput from "../../input/ExpressionInput";
import { Add, Delete } from "@mui/icons-material";
import ExpressionInputList from "../../input/ExpressionInputList";
import { IExpressionStore, Units } from "../../../document/ExpressionStore";
import VariableRenamingInput from "./VariableRenamingInput";
import styles from "../../input/InputList.module.css"
import { getEnv } from "mobx-state-tree";

type Props = object;
type State = {
  newVarName: string
}

class PoseVariablesConfigPanel extends Component<Props, State> {
  rowGap = 16;
  state={newVarName:""}
  localExpression = {
    x:doc.variables.createExpression("0 m", Units.Meter),
    y:doc.variables.createExpression("0 m", Units.Meter),
    heading: doc.variables.createExpression("0 deg", Units.Radian),}
  render() {
    const className = styles.InputList + " " + styles.Expression;
    doc.variables.poses.keys();
    return (
      <div style={{display:"flex", flexDirection:"column", justifyContent:"flex-start", overflowY:"scroll"}}>
        <div className={className} style={{ gridTemplateColumns: "max-content max-content auto max-content auto max-content auto max-content" }}>
          {
            Array.from(doc.variables.poses.entries()).map((entry) => 
            <>
            <VariableRenamingInput key={entry[0]+".name"} name={entry[0]} 
            setName={(name=>doc.variables.renamePose(entry[0], name))}>
            </VariableRenamingInput>
            <ExpressionInput
              enabled
              maxWidthCharacters={6}
              key={entry[0]+".x"}
              //title={""}
              title={"x"}
              number={entry[1].x}
            ></ExpressionInput>
            <ExpressionInput
              enabled
              maxWidthCharacters={6}
              key={entry[0]+".y"}
              //title={""}
              title={"y"}
              number={entry[1].y}
            ></ExpressionInput>
            <ExpressionInput
            key={entry[0]+".heading"}
              enabled
              maxWidthCharacters={6}
              //title={""}
              title={"θ"}
              number={entry[1].heading}
            ></ExpressionInput>
            <Delete onClick={()=>doc.variables.deletePose(entry[0])}></Delete></>)}
            <Divider sx={{gridColumn:"1 / -1"}}></Divider>
            {/* <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span> */}

            <VariableRenamingInput name={this.state.newVarName} 
            setName={(name=>this.setState({newVarName: name}))}>
            </VariableRenamingInput>
            <ExpressionInput
              enabled
              //title={""}
              title={"x"}
              number={this.localExpression.x}
            ></ExpressionInput>
            <ExpressionInput
              enabled
              //title={""}
              title={"y"}
              number={this.localExpression.y}
            ></ExpressionInput>
            <ExpressionInput
              enabled
              //title={""}
              title={"θ"}
              number={this.localExpression.heading}
            ></ExpressionInput>
            <IconButton size="small" onClick={_ => {
              let { newVarName } = this.state;
              if (newVarName !== "") {
                let pose = {x: this.localExpression.x.serialize, y:this.localExpression.y.serialize, heading:this.localExpression.heading.serialize};
                doc.variables.addPose(newVarName, pose);
              }
            }}>
              <Add></Add>
            </IconButton>
        </div>
        </div>
    );
  }
}
export default observer(PoseVariablesConfigPanel);
