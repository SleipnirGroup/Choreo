import Settings from "@mui/icons-material/Settings";
import { observer } from "mobx-react";
import { getIdentifier } from "mobx-state-tree";
import React, { Component } from "react";
import { CSSProperties } from "styled-components";
import DocumentManagerContext from "../../document/DocumentManager";
import { IHolonomicWaypointStore } from "../../document/DocumentModel";
import styles from "./SidebarWaypoint.module.css";

type Props = {
  context: React.ContextType<typeof DocumentManagerContext>;
};

type State = {};

class SidebarWaypoint extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  id: number = 0;
  state = {};

  render() {
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes
    // let selected = this.context.model.uiState.appPage== 2;
    let selected = this.context.model.robotConfig.selected;
    // let selected = getIdentifier(this.context.model.uiState.selectedSidebarItem) == this.context.model.robotConfig.identifier;
    return (
      <div
        className={styles.Container + (selected ? ` ${styles.selected}` : "")}
        onClick={() => {
          this.context.model.uiState.setSelectedSidebarItem(
            this.context.model.robotConfig
          );
        }}
      >
        <Settings></Settings>
        Robot Config
      </div>
    );
  }
}
export default observer(SidebarWaypoint);
