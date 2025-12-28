import { Input, Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import styles from "../../input/InputList.module.css";
import { NameIssue } from "../../../document/path/NameIsIdentifier";

type Props = {
  name: string;
  setName: (name: string) => void;
  validateName: (name: string) => NameIssue | undefined;
  width?: string;
};
function VariableRenamingInput(props: Props) {
  // default usage is that the props.name already exists as a variable
  function submit(name: string) {
    if (name !== null && props.validateName(name)) {
      props.setName(name);
    } else {
      setNewName(props.name);
      setRenameError(props.validateName(props.name));
    }
  }
  const [newName, setNewName] = useState<string>(props.name);
  const [renameError, setRenameError] = useState<NameIssue | undefined>(props.validateName(props.name))
  return (
    <Tooltip placement="left" arrow={true} disableInteractive title={renameError?.uiMessage ?? ""}>
    <Input
      type="standard"
      className={styles.Number + " " + styles.Mui}
      placeholder="Name"
      style={{ width: props.width ?? "auto" }}
      value={newName}
      onChange={(e) => {
        setNewName(e.currentTarget.value);
        setRenameError(props.validateName(e.currentTarget.value));
      }}
      error={renameError !== undefined}
      onKeyDown={(e) => {
        if (e.key == "Enter") {
          submit(e.currentTarget.value);
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => submit(e.currentTarget.value)}
    ></Input>
    </Tooltip>
  );
}
export default observer(VariableRenamingInput);
