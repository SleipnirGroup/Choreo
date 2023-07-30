import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { observer } from "mobx-react";
import styles from "./Sidebar.module.css";
import SidebarRobotConfig from "./SidebarRobotConfig";
import { Divider, IconButton, Tooltip } from "@mui/material";
import WaypointList from "./WaypointList";
import PathSelector from "./PathSelector";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/UploadFile";
import FileDownload from "@mui/icons-material/FileDownload";
import { NoteAddOutlined } from "@mui/icons-material";

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
        <div
          style={{
            flexShrink: 0,
            height: "var(--top-nav-height)",
            borderBottom: "thin solid var(--divider-gray)",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          <input
            type="file"
            id="file-upload-input"
            style={{ display: "none" }}
            onChange={(e) => {
              if (
                e.target != null &&
                e.target.files != null &&
                e.target.files.length >= 1
              ) {
                let fileList = e.target.files;
                this.context.onFileUpload(fileList[0]);
                e.target.value = "";
              }
            }}
          ></input>
          <label htmlFor="file-upload-input">
            <Tooltip title="Open File">
              <IconButton color="primary" component="span">
                <UploadIcon />
              </IconButton>
            </Tooltip>
          </label>

          <Tooltip title="Save File">
            <IconButton
              color="primary"
              onClick={() => {
                this.context.saveFile();
              }}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Trajectory">
            <IconButton
              color="primary"
              onClick={() => {
                this.context.exportActiveTrajectory();
              }}
            >
              <FileDownload />
            </IconButton>
          </Tooltip>
          <Tooltip title="New File">
            <IconButton
              color="primary"
              onClick={() => {
                this.context.newFile();
              }}
            >
              <NoteAddOutlined></NoteAddOutlined>
            </IconButton>
          </Tooltip>
        </div>
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
          <div>
            {" "}
            {/*Extra div to put the padding outside the SidebarRobotConfig component*/}
            <SidebarRobotConfig context={this.context}></SidebarRobotConfig>
          </div>

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
