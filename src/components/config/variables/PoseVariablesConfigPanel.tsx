import { Add, ArrowDropDown, ArrowDropUp, Delete } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { useState } from "react";
import { doc } from "../../../document/DocumentManager";
import { DimensionsExt, IExprPose } from "../../../document/ExpressionStore";
import ExpressionInput from "../../input/ExpressionInput";
import VariableRenamingInput from "./VariableRenamingInput";

type PoseVariablePanelProps = {
  entry: [string, IExprPose];
  setName: (name: string) => void;
  actionButton: () => JSX.Element;
  logo: () => JSX.Element;
  validateName: (name: string) => boolean;
};

const PoseVariablePanel = observer(
  (props: PoseVariablePanelProps & { open: boolean }) => {
    const entry = props.entry;

    return (
      <>
        {props.logo()}

        <VariableRenamingInput
          width="7ch"
          key={entry[0] + ".name"}
          name={entry[0]}
          setName={(name) => props.setName(name)}
          validateName={(name) => props.validateName(name)}
        ></VariableRenamingInput>
        {`(${entry[1].x.defaultUnitMagnitude?.toFixed(2)} m, ${entry[1].y.defaultUnitMagnitude?.toFixed(2)} m, ${entry[1].heading.defaultUnitMagnitude?.toFixed(2)} rad)`}
        {props.actionButton()}
        {props.open && (
          <>
            <span></span>
            <ExpressionInput
              enabled
              maxWidthCharacters={6}
              key={entry[0] + ".x"}
              title={"x"}
              number={entry[1].x}
            ></ExpressionInput>

            <span></span>
            <span></span>
            <ExpressionInput
              enabled
              maxWidthCharacters={6}
              key={entry[0] + ".y"}
              title={"y"}
              number={entry[1].y}
            ></ExpressionInput>
            <span></span>
            <span></span>

            <ExpressionInput
              key={entry[0] + ".heading"}
              enabled
              maxWidthCharacters={6}
              title={"θ"}
              number={entry[1].heading}
            ></ExpressionInput>
            <span></span>
          </>
        )}
      </>
    );
  }
);
const OpenablePoseVariablePanel = observer(
  (props: Omit<PoseVariablePanelProps, "open" | "logo">) => {
    const [open, setOpen] = useState(false);
    return (
      <PoseVariablePanel
        open={open}
        {...props}
        logo={() => (
          <span>
            <Tooltip disableInteractive title={DimensionsExt["Pose"].name}>
              {DimensionsExt["Pose"].icon()}
            </Tooltip>{" "}
            {open ? (
              <ArrowDropUp onClick={() => setOpen(false)}></ArrowDropUp>
            ) : (
              <ArrowDropDown onClick={() => setOpen(true)}></ArrowDropDown>
            )}
          </span>
        )}
      ></PoseVariablePanel>
    );
  }
);
export type AddPoseVariablePanelProps = {
  logo: () => JSX.Element;
  name: string;
  setName: (name: string) => void;
  pose: IExprPose;
};
export const AddPoseVariablePanel = observer(
  (props: AddPoseVariablePanelProps) => {
    return (
      <PoseVariablePanel
        validateName={(name) => doc.variables.validateName(name, "")}
        logo={props.logo}
        open={true}
        entry={[props.name, props.pose]}
        setName={(name) => props.setName(name)}
        actionButton={() => (
          <Add
            onClick={(_) => {
              if (doc.variables.validateName(props.name, "")) {
                const pose = {
                  x: props.pose.x.serialize,
                  y: props.pose.y.serialize,
                  heading: props.pose.heading.serialize
                };
                doc.variables.addPose(props.name, pose);
                props.setName("");
              }
            }}
          ></Add>
        )}
      ></PoseVariablePanel>
    );
  }
);

const PoseVariablesConfigPanel = observer(() => {
  doc.variables.poses.keys();
  return (
    <>
      {Array.from(doc.variables.poses.entries()).map((entry) => (
        <OpenablePoseVariablePanel
          entry={entry}
          setName={(name) => doc.variables.renamePose(entry[0], name)}
          validateName={(name) => doc.variables.validateName(name, entry[0])}
          actionButton={() => (
            <Delete onClick={() => doc.variables.deletePose(entry[0])}></Delete>
          )}
        ></OpenablePoseVariablePanel>
      ))}
    </>
  );
});
export default PoseVariablesConfigPanel;
