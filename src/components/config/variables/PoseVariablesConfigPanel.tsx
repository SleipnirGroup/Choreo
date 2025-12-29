import { Add, ArrowDropDown, ArrowDropUp, Delete } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { doc } from "../../../document/DocumentManager";
import { DimensionsExt, IExprPose } from "../../../document/ExpressionStore";
import ExpressionInput from "../../input/ExpressionInput";
import VariableRenamingInput from "./VariableRenamingInput";

type PoseVariablePanelProps = {
  name: string;
  pose: IExprPose;
  setName: (name: string) => void;
  actionButton: () => React.JSX.Element;
  logo: () => React.JSX.Element;
  validateName: (name: string) => boolean;
};

const PoseVariablePanel = observer(
  (
    props: PoseVariablePanelProps & {
      open: boolean;
      setOpen: undefined | ((open: boolean) => void);
    }
  ) => {
    return (
      <>
        {props.logo()}

        <VariableRenamingInput
          width={doc.variables.maxNameLength + 1 + "ch"}
          key={props.name + ".name"}
          name={props.name}
          setName={(name) => props.setName(name)}
          validateName={(name) => props.validateName(name)}
        ></VariableRenamingInput>
        {/* The part that stays visible when closed. Clicking it opens/closes the panel if setOpen is defined*/}
        <span
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between"
          }}
          onClick={() => {
            if (props.setOpen !== undefined) {
              props.setOpen(!props.open);
            }
          }}
        >
          <span>
            {`(${props.pose.x.value.toFixed(2)} m, ${props.pose.y.value.toFixed(2)} m, ${props.pose.heading.value.toFixed(2)} rad)`}
          </span>
          <Tooltip
            disableInteractive
            title={!props.open ? "Edit Pose" : "Close Panel"}
          >
            <span>
              {props.open && props.setOpen !== undefined ? (
                <ArrowDropUp></ArrowDropUp>
              ) : (
                <ArrowDropDown></ArrowDropDown>
              )}
            </span>
          </Tooltip>
        </span>
        {props.actionButton()}
        {props.open && (
          <>
            <span></span>
            <ExpressionInput
              enabled
              maxWidthCharacters={6}
              key={name + ".x"}
              title={".x"}
              number={props.pose.x}
            ></ExpressionInput>

            <span></span>
            <span></span>
            <ExpressionInput
              enabled
              maxWidthCharacters={6}
              key={name + ".y"}
              title={".y"}
              number={props.pose.y}
            ></ExpressionInput>
            <span></span>
            <span></span>

            <ExpressionInput
              key={name + ".heading"}
              enabled
              maxWidthCharacters={6}
              title={".heading"}
              number={props.pose.heading}
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
        setOpen={setOpen}
        {...props}
        logo={() => (
          <span>
            <Tooltip disableInteractive title={DimensionsExt["Pose"].name}>
              {DimensionsExt["Pose"].icon()}
            </Tooltip>
          </span>
        )}
      ></PoseVariablePanel>
    );
  }
);
export type AddPoseVariablePanelProps = {
  logo: () => React.JSX.Element;
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
        setOpen={undefined}
        name={props.name}
        pose={props.pose}
        setName={(name) => props.setName(name)}
        actionButton={() => (
          <Add
            sx={{ color: "var(--accent-purple)" }}
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
      {doc.variables.sortedPoses.map(([uuid, variable]) => (
        <OpenablePoseVariablePanel
          name={variable.name}
          pose={variable.pose}
          setName={variable.setName}
          validateName={(name) =>
            doc.variables.validateName(name, variable.name)
          }
          actionButton={() => (
            <Delete onClick={() => doc.variables.deletePose(uuid)}></Delete>
          )}
        ></OpenablePoseVariablePanel>
      ))}
    </>
  );
});
export default PoseVariablesConfigPanel;
