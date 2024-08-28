import { Input } from "@mui/material";
import { observer } from "mobx-react";
import { detach } from "mobx-state-tree";
import { useState } from "react";
import { IVariables } from "../../../document/ExpressionStore";

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
    return <Input type="text" value={newName}
        onChange={e=>setNewName(e.currentTarget.value)}
        onKeyDown={e => {
            if (e.key == "Enter") {
                submit(e.currentTarget.value);
                e.currentTarget.blur();
            }
        }}
        onBlur={e=>submit(e.currentTarget.value)}>

      </Input>
}
export default observer(VariableRenamingInput);