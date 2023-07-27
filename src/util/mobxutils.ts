import { getIdentifier, IAnyStateTreeNode } from "mobx-state-tree";

export let safeGetIdentifier = (target : IAnyStateTreeNode | undefined) => {
    if (target === undefined) {
        return undefined;
    }
    else {
        return getIdentifier(target);
    }
}