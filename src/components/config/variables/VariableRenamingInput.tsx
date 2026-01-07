import { Input, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { useState } from "react";
import styles from "../../input/InputList.module.css";
import {
  isNameIssueError,
  isNameIssueWarning,
  NameIssue
} from "../../../document/path/NameIsIdentifier";
import AutoSizingInput from "../../input/AutoSizingInput";

type Props = {
  name: string;
  setName: (name: string) => void;
  validateName: (name: string) => NameIssue | undefined;
  width?: string;
  autoWidth?: boolean;
};
function VariableRenamingInput(props: Props) {
  // default usage is that the props.name already exists as a variable
  function submit(name: string) {
    if (
      name !== null &&
      isNameIssueError(props.validateName(name)) === undefined &&
      name !== props.name
    ) {
      props.setName(name);
    } else {
      setNewName(props.name);
      setRenameError(props.validateName(props.name));
    }
  }
  const [newName, setNewName] = useState<string>(props.name);
  const [renameError, setRenameError] = useState<NameIssue | undefined>(
    props.validateName(props.name)
  );
  const isWarning = isNameIssueWarning(renameError) !== undefined;
  const isError = isNameIssueError(renameError) !== undefined;
  return (
    <Tooltip
      placement="left"
      arrow={true}
      disableInteractive
      title={renameError?.uiMessage ?? ""}
    >
      <Input
        inputProps={{
          "size":newName.length
        }}
        type="standard"
        className={styles.Number + " " + styles.Mui}
        placeholder="Name"
        style={{
          width: props.width ?? "auto",
          fontFamily: "Roboto Mono Variable"
        }}
        value={newName}
        onChange={(e) => {
          setNewName(e.currentTarget.value);
          setRenameError(props.validateName(e.currentTarget.value));
        }}
        onKeyDown={(e) => {
          if (e.key == "Enter") {
            submit(e.currentTarget.value);
            e.currentTarget.blur();
          }
        }}
        onBlur={(e) => submit(e.currentTarget.value)}
        sx={
          isError
            ? {
                "&::before, &::after": {
                  borderColor: "red !important",
                  color: "red !important"
                },
                "& label, & P": { color: "red !important" }
              }
            : isWarning
              ? {
                  "&::before, &::after": {
                    borderColor: "orange !important",
                    color: "orange !important"
                  },
                  "& label, & P": { color: "orange !important" }
                }
              : {}
        }
      ></Input>
    </Tooltip>
  );
}
export default observer(VariableRenamingInput);
