import { Add, Delete } from "@mui/icons-material";
import { MenuItem, Select, SelectChangeEvent, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import React, { useMemo, useState } from "react";
import { doc } from "../../../document/DocumentManager";
import {
  DimensionName,
  DimensionNameExt,
  DimensionNamesExt,
  DimensionsExt,
  IExpressionStore
} from "../../../document/ExpressionStore";
import ExpressionInput from "../../input/ExpressionInput";
import { AddPoseVariablePanel } from "./PoseVariablesConfigPanel";
import VariableRenamingInput from "./VariableRenamingInput";

const VariablePanel = observer(
  (props: {
    name: string;
    expression: IExpressionStore;
    setName: (name: string) => void;
    actionButton: () => React.JSX.Element;
    logo: () => React.JSX.Element;
    validateName: (name: string) => boolean;
  }) => {
    return (
      <>
        {props.logo()}
        <ExpressionInput
          key={`${props.name}-expr`}
          enabled
          title={() => (
            <VariableRenamingInput
              validateName={(name) => props.validateName(name)}
              width="7ch"
              name={props.name}
              setName={(name) => props.setName(name)}
            ></VariableRenamingInput>
          )}
          number={props.expression}
        ></ExpressionInput>
        {props.actionButton()}
      </>
    );
  }
);

type AddVariablePanelProps = {
  logo: () => React.JSX.Element;
  name: string;
  setName: (name: string) => void;
  expr: IExpressionStore;
};

const AddVariablePanel = observer((props: AddVariablePanelProps) => {
  return (
    <VariablePanel
      logo={props.logo}
      name={props.name}
      expression={props.expr}
      setName={(name) => props.setName(name)}
      validateName={(name) => doc.variables.validateName(name, "")}
      actionButton={() => (
        <Add
          sx={{ color: "var(--accent-purple)" }}
          onClick={(_) => {
            if (doc.variables.validateName(props.name, "")) {
              doc.variables.add(
                props.name,
                props.expr.serialize.exp,
                props.expr.dimension
              );
              props.setName("");
            }
          }}
        ></Add>
      )}
    ></VariablePanel>
  );
});

export const GeneralVariableAddPanel = observer(() => {
  const [name, setName] = useState("");
  const [type, setType] = useState<DimensionNameExt>("Number");
  const localExpression = useMemo(
    () => doc.variables.createExpression("0", "Number"),
    []
  );
  const localPose = useMemo(
    () =>
      doc.variables.createPose({
        x: 0,
        y: 0,
        heading: 0
      }),
    []
  );
  const logo = () => (
    <Select
      size="small"
      variant="standard"
      value={type}
      renderValue={(value) => DimensionsExt[value].icon()}
      sx={{
        ".MuiSelect-select": {
          padding: "0px !important",
          height: "0px !important",
          paddingRight: "24px !important"
        }
      }}
      onChange={(e: SelectChangeEvent<DimensionNameExt>) => {
        setType(e.target.value as DimensionNameExt);
        if (e.target.value !== "Pose") {
          localExpression.setDimension(e.target.value as DimensionName);
        }
      }}
    >
      {DimensionNamesExt.map((entry) => (
        <MenuItem value={entry}>
          {DimensionsExt[entry].icon()}
          <span style={{ width: "4px" }}></span>
          {DimensionsExt[entry].name}
        </MenuItem>
      ))}
    </Select>
  );
  if (type === "Pose") {
    return (
      <AddPoseVariablePanel
        logo={logo}
        name={name}
        setName={setName}
        pose={localPose}
      ></AddPoseVariablePanel>
    );
  } else {
    return (
      <AddVariablePanel
        logo={logo}
        name={name}
        setName={setName}
        expr={localExpression}
      ></AddVariablePanel>
    );
  }
});
const VariablesConfigPanel = observer(() => {
  doc.variables.expressions.keys();
  return (
    <>
      {doc.variables.sortedExpressions.map(([uuid, variable]) => (
        <VariablePanel
          validateName={(newName) =>
            doc.variables.validateName(newName, variable.name)
          }
          logo={() => (
            <Tooltip
              disableInteractive
              title={DimensionsExt[variable.expr.dimension].name}
            >
              {DimensionsExt[variable.expr.dimension].icon()}
            </Tooltip>
          )}
          expression={variable.expr}
          name={variable.name}
          setName={variable.setName}
          actionButton={() => (
            <Delete
              onClick={() => doc.variables.deleteExpression(uuid)}
            ></Delete>
          )}
        ></VariablePanel>
      ))}
    </>
  );
});

export default VariablesConfigPanel;
