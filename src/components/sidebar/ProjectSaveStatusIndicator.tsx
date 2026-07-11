import { observer } from "mobx-react";
import React, { Component } from "react";
import { saveProject, saveProjectDialog } from "../../document/DocumentManager";
import { SavingState as SavingState } from "../../document/UIStateStore";
import { Check, FolderOff, PriorityHigh } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import SaveInProgress from "../../assets/SaveInProgress";

type Props = {
  savingState: SavingState;
  iconClass?: string;
};

type State = object;

const icons = {
  [SavingState.ERROR]: () => <PriorityHigh></PriorityHigh>,
  [SavingState.SAVING]: () => <SaveInProgress></SaveInProgress>,
  [SavingState.NO_LOCATION]: () => <FolderOff></FolderOff>,
  [SavingState.SAVED]: () => <Check></Check>
} satisfies {
  [K in SavingState]: () => React.JSX.Element;
};
const tooltips = {
  [SavingState.ERROR]: "Error while Saving. Click to retry.",
  [SavingState.SAVING]: "Saving...",
  [SavingState.NO_LOCATION]: "Save Project",
  [SavingState.SAVED]: "Project Saved"
} satisfies {
  [K in SavingState]: string;
};
class SaveStatusIndicator extends Component<Props, State> {
  getIcon() {
    return icons[this.props.savingState]?.() ?? <PriorityHigh></PriorityHigh>;
  }
  getTooltip() {
    return tooltips[this.props.savingState] ?? "";
  }
  isDisabled() {
    return this.props.savingState != SavingState.NO_LOCATION;
  }
  render() {
    return (
      <span>
        <Tooltip title={this.getTooltip()}>
          <span>
            <IconButton
              disabled={this.isDisabled()}
              onClick={() => {
                const state = this.props.savingState;
                if (state == SavingState.NO_LOCATION) {
                  saveProjectDialog();
                }
                if (state == SavingState.ERROR) {
                  saveProject();
                }
              }}
            >
              {this.getIcon()}
            </IconButton>
          </span>
        </Tooltip>
      </span>
    );
  }
}

export default observer(SaveStatusIndicator);
