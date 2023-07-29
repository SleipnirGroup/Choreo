import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { observer } from "mobx-react";
import styles from "./Sidebar.module.css";
import SidebarRobotConfig from "./SidebarRobotConfig";
import { Divider } from "@mui/material";
import WaypointList from "./WaypointList";
import PathSelector from "./PathSelector";

type Props = {};
type State = {};

class Sidebar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  constructor(props: Props) {
    super(props);
  }

  render() {
    return (
      <div className={styles.Container}>
        <Divider></Divider>
        <div>PATHS</div>
        <Divider></Divider>
        <div
          className={styles.Sidebar}
          style={{ maxHeight: "135px", minHeight: "50px" }}
        >
          <PathSelector></PathSelector>
        </div>
        <Divider></Divider>

        {/* <Divider className={styles.SidebarDivider} textAlign="left" flexItem>CONSTRAINTS</Divider> 
          // shhh.. to come later*/}
        <div>SETTINGS</div>
        <Divider flexItem></Divider>
        <div className={styles.Sidebar}>
          <SidebarRobotConfig context={this.context}></SidebarRobotConfig>
          <Divider className={styles.SidebarDivider} textAlign="left" flexItem>
            <span>WAYPOINTS</span>
          </Divider>

          <WaypointList></WaypointList>
          <Divider></Divider>
        </div>
      </div>
    );
  }
}
export default observer(Sidebar);
