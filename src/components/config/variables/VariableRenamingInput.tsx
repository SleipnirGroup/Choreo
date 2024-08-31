import { Input } from "@mui/material";
import { observer } from "mobx-react";
import { useState } from "react";
import styles from "../../input/InputList.module.css";

type Props = {
  name: string;
  setName: (name: string) => void;
  validateName: (name: string) => boolean;
  width?: string;
};
function VariableRenamingInput(props: Props) {
  // default usage is that the props.name already exists as a variable
  function submit(name: string) {
    if (name !== null && props.validateName(name)) {
      props.setName(name);
    }
  }
  const [newName, setNewName] = useState<string>(props.name);
  const [valid, setValid] = useState<boolean>(props.validateName(props.name));
  return (
    <Input
      type="standard"
      className={styles.Number + " " + styles.Mui}
      placeholder="Name"
      style={{ width: props.width ?? "auto" }}
      value={newName}
      onChange={(e) => {
        setNewName(e.currentTarget.value);
        console.log("change");
        setValid(props.validateName(e.currentTarget.value));
      }}
      error={!valid}
      onKeyDown={(e) => {
        if (e.key == "Enter") {
          submit(e.currentTarget.value);
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => submit(e.currentTarget.value)}
    ></Input>
  );
}
export default observer(VariableRenamingInput);
