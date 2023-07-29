import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/UploadFile";
import IconButton from "@mui/material/IconButton";
import FileDownload from "@mui/icons-material/FileDownload";
import Tooltip from "@mui/material/Tooltip";
import styles from "./Navbar.module.css";
import { observer } from "mobx-react";
import GridIcon from "@mui/icons-material/GridOn";
import GridOffIcon from "@mui/icons-material/GridOff";
import Divider from "@mui/material/Divider";
import ArrowDownIcon from "@mui/icons-material/ArrowDropDown";
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  Popover,
} from "@mui/material";
import { ViewLabels } from "../../document/UIStateStore";

type Props = {};

type State = {};

class Navbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    return (
      <div className={styles.Container}>
        <span
          style={{
            paddingLeft: "16px",
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
        </span>
      </div>
    );
  }
}
export default observer(Navbar);
