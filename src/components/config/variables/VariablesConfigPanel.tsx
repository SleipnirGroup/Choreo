import { Add, Delete } from "@mui/icons-material";
import { MenuItem, Select, SelectChangeEvent, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { useMemo, useState } from "react";
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
    entry: [string, IExpressionStore];
    setName: (name: string) => void;
    actionButton: () => JSX.Element;
    logo: () => JSX.Element;
    validateName: (name: string) => boolean;
  }) => {
    const entry = props.entry;
    return (
      <>
        {props.logo()}
        <ExpressionInput
          key={`${entry[0]}-expr`}
          enabled
          title={() => (
            <VariableRenamingInput
              validateName={(name) => props.validateName(name)}
              width="7ch"
              name={entry[0]}
              setName={(name) => props.setName(name)}
            ></VariableRenamingInput>
          )}
          number={entry[1]}
        ></ExpressionInput>
        {props.actionButton()}
      </>
    );
  }
);

type AddVariablePanelProps = {
  logo: () => JSX.Element;
  name: string;
  setName: (name: string) => void;
  expr: IExpressionStore;
};

const AddVariablePanel = observer((props: AddVariablePanelProps) => {
  return (
    <VariablePanel
      logo={props.logo}
      entry={[props.name, props.expr]}
      setName={(name) => props.setName(name)}
      validateName={(name) => doc.variables.validateName(name, "")}
      actionButton={() => (
        <Add
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
          <Tooltip disableInteractive title={DimensionsExt[entry].name}>
            {DimensionsExt[entry].icon()}
          </Tooltip>
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
      {Array.from(doc.variables.expressions.entries()).map((entry) => (
        <VariablePanel
          validateName={(name) => doc.variables.validateName(name, entry[0])}
          logo={() => (
            <Tooltip
              disableInteractive
              title={DimensionsExt[entry[1].dimension].name}
            >
              {DimensionsExt[entry[1].dimension].icon()}
            </Tooltip>
          )}
          entry={entry}
          setName={(name) => doc.variables.renameExpression(entry[0], name)}
          actionButton={() => (
            <Delete
              onClick={() => doc.variables.deleteExpression(entry[0])}
            ></Delete>
          )}
        ></VariablePanel>
      ))}
    </>
  );
});

export default VariablesConfigPanel;
