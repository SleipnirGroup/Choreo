import { observer } from "mobx-react";
import { Component } from "react";
import { doc, saveProject, saveProjectDialog, uiState } from "../../document/DocumentManager";
import { ProjectSavingState as SavingState } from "../../document/UIStateStore";
import SaveStatusIndicator from "./SaveStatusIndicator";

type Props = object;

type State = object;

class ProjectSaveStatusIndicator extends Component<Props, State> {
    render() {
        return     <SaveStatusIndicator savingState={uiState.projectSavingState} onClick={(state)=>{
            if (state == SavingState.NO_LOCATION) {
                saveProjectDialog();
            }
            if (state == SavingState.ERROR) {
                saveProject();
            }
          }}></SaveStatusIndicator>
    }
}

export default observer(ProjectSaveStatusIndicator);