import Settings from "@mui/icons-material/Settings";
import { observer } from "mobx-react";

import React, { Component } from "react";
import {doc, uiState} from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";

type Props = {
};

type State = object;

class SidebarRobotConfig extends Component<Props, State> {
  

  id: number = 0;
  state = {};

  render() {
    // apparently we have to dereference this here instead of inline in the class name
    // Otherwise the component won't rerender when it changes
    const selected = doc.robotConfig.selected;
    return (
      <div
        className={styles.SidebarItem + (selected ? ` ${styles.Selected}` : "")}
        onClick={() => {
          doc.setSelectedSidebarItem(
            doc.robotConfig
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
