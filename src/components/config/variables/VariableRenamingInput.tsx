import { Input } from "@mui/material";
import { observer } from "mobx-react";
import { detach } from "mobx-state-tree";
import { useState } from "react";
import { IVariables } from "../../../document/ExpressionStore";
import styles from "../../input/InputList.module.css"

type Props = {
    name: string,
    setName: (name: string)=>void
}  
function VariableRenamingInput(props: Props) {
    function submit(name:string) {
        if (newName !== null) {
            props.setName(newName);
        }
    }
    const [newName, setNewName] = useState<string>(props.name);
    return <input className={styles.Number} type="text" style={{width:"7ch"}}value={newName}
        onChange={e=>setNewName(e.currentTarget.value)}
        onKeyDown={e => {
            if (e.key == "Enter") {
                submit(e.currentTarget.value);
                e.currentTarget.blur();
            }
        }}
        onBlur={e=>submit(e.currentTarget.value)}>
        
      </input>
}
export default observer(VariableRenamingInput);