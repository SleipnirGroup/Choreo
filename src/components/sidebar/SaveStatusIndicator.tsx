import { observer } from "mobx-react";
import { Component } from "react";
import { doc, saveProject, saveProjectDialog, uiState } from "../../document/DocumentManager";
import { ProjectSavingState as SavingState } from "../../document/UIStateStore";
import { Check, FolderOff, PriorityHigh, Save } from "@mui/icons-material";
import { Box, CircularProgress, IconButton, Tooltip } from "@mui/material";
import SaveInProgress from "../../assets/SaveInProgress";

type Props = {
    savingState: SavingState,
    onClick: ((state: SavingState)=>void)
};

type State = object;

const icons = {
    [SavingState.ERROR]: ()=><PriorityHigh></PriorityHigh>,
    [SavingState.SAVING]: ()=><SaveInProgress></SaveInProgress>,
    [SavingState.NO_LOCATION]:()=><FolderOff></FolderOff>,
    [SavingState.SAVED]: ()=><Check></Check>
} satisfies {
    [K in SavingState]: () => JSX.Element;
}
const tooltips = {
    [SavingState.ERROR]: "Error while Saving. Click to retry.",
    [SavingState.SAVING]: "Saving...",
    [SavingState.NO_LOCATION]:"Save Project",
    [SavingState.SAVED]: "Project Saved"
} satisfies {
    [K in SavingState]: string;
}
class SaveStatusIndicator extends Component<Props, State> {
    getIcon() {
        return icons[this.props.savingState]?.() ?? <PriorityHigh></PriorityHigh>
    } 
    getTooltip() {
        return tooltips[this.props.savingState] ?? "";
    } 
    isDisabled() {
        return this.props.savingState != SavingState.NO_LOCATION;
    }
    render() {
        return <span>
            <Tooltip title={this.getTooltip()}>
                <span>
            <IconButton disabled={this.isDisabled()} onClick={()=>this.props.onClick(this.props.savingState)}>
            {this.getIcon()}
            </IconButton>
            </span>
            </Tooltip>
        </span>
    }
}

export default observer(SaveStatusIndicator);