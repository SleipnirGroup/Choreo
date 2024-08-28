import { Input } from "@mui/material";
import { observer } from "mobx-react";
import { detach } from "mobx-state-tree";
import { useState } from "react";
import { IVariables } from "../../../document/ExpressionStore";

type Props = {
    vars: IVariables,
    name: string
}
function VariableRenamingInput(props: Props) {
    const [newName, setNewName] = useState<string>(props.name);
    return <Input type="text" value={newName}
        onChange={e=>setNewName(e.currentTarget.value)}
    onKeyDown={e => {
        if (e.key == "Enter") {
            let newName = e.currentTarget.value;
            if (newName !== null) {
            props.vars.renameExpression(props.name, newName);
            }
        }
        }}>

      </Input>
}
export default observer(VariableRenamingInput);