import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/UploadFile";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import styles from "./Navbar.module.css";
import { observer } from "mobx-react";
import GridIcon from "@mui/icons-material/GridOn";
import GridOffIcon from "@mui/icons-material/GridOff";
import Divider from "@mui/material/Divider";
import ArrowDownIcon from "@mui/icons-material/ArrowDropDown";

type Props = {};

type State = {};

class Navbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    return (
      <div className={styles.Container}>
        <span style={{ flexShrink: 0 }}>
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
        </span>
        <Divider orientation="vertical" flexItem />
        <span
          style={{
            flexShrink: 1,
            flexGrow: 0,
            minWidth: 0,
            display: "flex",
            justifyContent: "space-between",
            paddingInline: "10px",
          }}
          onClick={() => this.context.uiState.setPageNumber(0)}
        >
          <span
            style={{
              display: "inline-block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexGrow: 1,
              minWidth: 0,
              margin: "auto",
            }}
          >
            {this.context.model.pathlist.activePath.name}
          </span>
          <Tooltip title="Open Path Dialog">
            <IconButton color="default" className={styles.generate}>
              <ArrowDownIcon />
            </IconButton>
          </Tooltip>
        </span>
        <Divider orientation="vertical" flexItem />

        <span style={{ flexShrink: 0 }}>
          <Tooltip title="Field Grid">
            <span>
              <IconButton
                color="primary"
                className={styles.generate}
                onClick={() =>
                  this.context.uiState.setFieldGridView(
                    !this.context.uiState.fieldGridView
                  )
                }
              >
                {this.context.uiState.fieldGridView ? (
                  <GridIcon />
                ) : (
                  <GridOffIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Settings">
            <span>
              <IconButton
                color="primary"
                onClick={() => this.context.uiState.setPageNumber(2)}
              >
                <SettingsIcon />
              </IconButton>
            </span>
          </Tooltip>
        </span>
      </div>
    );
  }
}
export default observer(Navbar);
