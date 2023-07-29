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
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { NavbarItemData, ViewLabels } from "../../document/UIStateStore";

type Props = {};

type State = {};

class Navbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    let {selectedNavbarItem, setSelectedNavbarItem} = this.context.model.uiState;
    return (
      <div className={styles.Container}>
        {/* <span
          style={{
            paddingLeft: "16px",
            alignItems: "center"
          }}
        > */}
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
          <Divider orientation="vertical" flexItem></Divider>
          <ToggleButtonGroup 
            className={styles.ToggleGroup}
            exclusive
            value = {`${selectedNavbarItem}`}
            onChange={(e, newSelection)=>{
              console.log(newSelection)
              setSelectedNavbarItem(Number.parseInt(newSelection) ?? -1)}}>
            {(
              NavbarItemData.map((item, index)=>(
                <Tooltip value={`${index}`} title={item.name}>
                <ToggleButton value={`${index}`} sx={{
                  color:"var(--accent-purple)",
                  "&.Mui-selected": {
                    color: "var(--select-yellow)"
                  }
        }}>
                    {(item.icon)}
                  </ToggleButton>
                  </Tooltip>

              ))
            )}
          </ToggleButtonGroup>
        {/* </span> */}
      </div>
    );
  }
}
export default observer(Navbar);
