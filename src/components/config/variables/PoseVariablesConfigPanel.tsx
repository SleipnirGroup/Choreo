import { Divider, IconButton, Input, Switch, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { Component, Fragment, useMemo, useState } from "react";
import { Env, doc } from "../../../document/DocumentManager";
import inputStyles from "../input/InputList.module.css";
import ExpressionInput from "../../input/ExpressionInput";
import { Add, ArrowDropDown, ArrowDropUp, Delete } from "@mui/icons-material";
import ExpressionInputList from "../../input/ExpressionInputList";
import { Dimensions, DimensionsExt, IExprPose, IExpressionStore, Units } from "../../../document/ExpressionStore";
import VariableRenamingInput from "./VariableRenamingInput";
import styles from "../../input/InputList.module.css"
import { getEnv } from "mobx-state-tree";
import Waypoint from "../../../assets/Waypoint";

type Props = object;
type State = {
  newVarName: string
}

type PoseVariablePanelProps = { 
  entry: [string, IExprPose], 
  setName: (name: string) => void, 
  actionButton: () => JSX.Element, 
  logo: () => JSX.Element,
  validateName: (name:string)=>boolean
};

const PoseVariablePanel = observer((props: PoseVariablePanelProps & {open: boolean}) => {
  let entry = props.entry;

  return <>
    {props.logo()}


    <VariableRenamingInput width="7ch" key={entry[0] + ".name"} name={entry[0]}
      setName={(name) => props.setName(name)} validateName={(name)=>props.validateName(name)}>
    </VariableRenamingInput>
    {`(${entry[1].x.defaultUnitMagnitude?.toFixed(2)} m, ${entry[1].y.defaultUnitMagnitude?.toFixed(2)} m, ${entry[1].heading.defaultUnitMagnitude?.toFixed(2)} rad)`}{props.actionButton()}
    {props.open && <>
      <span></span>
      <ExpressionInput
        enabled
        maxWidthCharacters={6}
        key={entry[0] + ".x"}
        //title={""}
        title={"x"}
        number={entry[1].x}
      ></ExpressionInput>

      <span></span><span></span>
      <ExpressionInput
        enabled
        maxWidthCharacters={6}
        key={entry[0] + ".y"}
        //title={""}
        title={"y"}
        number={entry[1].y}
      ></ExpressionInput>
<span></span><span></span>

      <ExpressionInput
        key={entry[0] + ".heading"}
        enabled
        maxWidthCharacters={6}
        //title={""}
        title={"θ"}
        number={entry[1].heading}
      ></ExpressionInput><span></span>
    </>}
  </>
});
const OpenablePoseVariablePanel = observer((props: Omit<PoseVariablePanelProps, "open" | "logo">) => {
  let [open, setOpen] = useState(false);
  return <PoseVariablePanel
  
    open = {open}
    {...props}
    
    logo={() => <span>
      <Tooltip disableInteractive title={DimensionsExt["Pose"].name}>
    {DimensionsExt["Pose"].icon()}
  </Tooltip> {open ? (
      <ArrowDropUp onClick={() => setOpen(false)}></ArrowDropUp>
    ) : <ArrowDropDown onClick={() => setOpen(true)}></ArrowDropDown>}</span>}
    
    ></PoseVariablePanel>
});
export type AddPoseVariablePanelProps = {
  logo: ()=>JSX.Element,
  name: string,
  setName: (name: string)=>void,
  pose: IExprPose
}
export const AddPoseVariablePanel = observer( (props: AddPoseVariablePanelProps)=> {

  return (
  <PoseVariablePanel
  validateName={name=>doc.variables.validateName(name, "")}
  logo={props.logo}
  open={true} entry={[props.name, props.pose]}
      setName={(name) =>props.setName(name)}
      actionButton={() =>
        <Add onClick={_ => {
          if (doc.variables.validateName(props.name, "")) {
            let pose = { x: props.pose.x.serialize, y: props.pose.y.serialize, heading: props.pose.heading.serialize };
            doc.variables.addPose(props.name, pose);
            props.setName("");
          }
        }}></Add>
      }></PoseVariablePanel>)
  
})

const PoseVariablesConfigPanel = observer( ()=>{

    doc.variables.poses.keys();
    return (
      <>
        {
          Array.from(doc.variables.poses.entries()).map((entry) =>
          <OpenablePoseVariablePanel 
            entry={entry} 
            setName={(name) => doc.variables.renamePose(entry[0], name)} 
            validateName={name=>doc.variables.validateName(name, entry[0])}
            actionButton={() => <Delete onClick={() => doc.variables.deletePose(entry[0])}></Delete>}></OpenablePoseVariablePanel>
          )}
        
      </>
    );
  }
);
export default PoseVariablesConfigPanel;
