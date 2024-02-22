import Settings from "@mui/icons-material/Settings";
import { observer } from "mobx-react";

import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";

type Props = {
  context: React.ContextType<typeof DocumentManagerContext>;
};

type State = object;

class SidebarRobotConfig extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  id: number = 0;
  state = {};

  render() {
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes
    const selected = this.context.model.document.robotConfig.selected;
    return (
      <div
        className={styles.SidebarItem + (selected ? ` ${styles.Selected}` : "")}
        onClick={() => {
          this.context.model.uiState.setSelectedSidebarItem(
            this.context.model.document.robotConfig
          );
        }}
      >
        <Settings
          className={styles.SidebarIcon}
          htmlColor={selected ? "var(--select-yellow)" : "var(--accent-purple)"}
        ></Settings>
        <span className={styles.SidebarLabel}>Robot Config</span>
      </div>
    );
  }
}
export default observer(SidebarRobotConfig);
