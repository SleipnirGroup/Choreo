import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { observer } from "mobx-react";
import styles from "./Sidebar.module.css";
import SidebarRobotConfig from "./SidebarRobotConfig";
import { Divider, IconButton, Tooltip } from "@mui/material";
import WaypointList from "./WaypointList";
import PathSelector from "./PathSelector";
import MenuIcon from "@mui/icons-material/Menu";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/UploadFile";
import FileDownload from "@mui/icons-material/FileDownload";
import { NoteAddOutlined, Redo, Undo } from "@mui/icons-material";
import Add from "@mui/icons-material/Add";

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
    let { toggleMainMenu } = this.context.model.uiState;
    return (
      <div className={styles.Container}>
        <div
          style={{
            flexShrink: 0,
            height: "var(--top-nav-height)",
            borderBottom: "thin solid var(--divider-gray)",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingLeft: 0,
            zIndex: 1000,
          }}
        >
          <span>
            <Tooltip title="Main Menu">
              <IconButton
                onClick={() => {
                  toggleMainMenu();
                }}
              >
                <MenuIcon></MenuIcon>
              </IconButton>
            </Tooltip>
            Choreo
          </span>
          <span>
            <Tooltip title="Undo">
              <IconButton
                disabled={!this.context.history.canUndo}
                onClick={() => {
                  this.context.undo();
                }}
              >
                <Undo></Undo>
              </IconButton>
            </Tooltip>
            <Tooltip title="Redo">
              <IconButton
                disabled={!this.context.history.canRedo}
                onClick={() => {
                  this.context.redo();
                }}
              >
                <Redo></Redo>
              </IconButton>
            </Tooltip>
          </span>
        </div>
        <div className={styles.SidebarHeading}>
          PATHS
          <Tooltip title="Add Path">
            <IconButton
              size="small"
              color="default"
              style={{
                float: "right",
              }}
              onClick={() =>
                this.context.model.document.pathlist.addPath("New Path", true)
              }
            >
              <Add fontSize="small"></Add>
            </IconButton>
          </Tooltip>
        </div>
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
        <div className={styles.SidebarHeading}>SETTINGS</div>
        <Divider flexItem></Divider>
        <div className={styles.Sidebar}>
          <div>
            {" "}
            {/*Extra div to put the padding outside the SidebarRobotConfig component*/}
            <SidebarRobotConfig context={this.context}></SidebarRobotConfig>
          </div>

          <Divider className={styles.SidebarDivider} textAlign="left" flexItem>
            <span>WAYPOINTS</span>
          </Divider>

          <WaypointList></WaypointList>
        </div>
        <Divider></Divider>
      </div>
    );
  }
}
export default observer(Sidebar);
