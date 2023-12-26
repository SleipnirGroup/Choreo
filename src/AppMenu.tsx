import React, { Component } from "react";
import DocumentManagerContext from "./document/DocumentManager";
import { observer } from "mobx-react";
import {
  Dialog,
  DialogTitle,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import MenuIcon from "@mui/icons-material/Menu";
import UploadIcon from "@mui/icons-material/UploadFile";
import IconButton from "@mui/material/IconButton";
import FileDownload from "@mui/icons-material/FileDownload";
import Tooltip from "@mui/material/Tooltip";
import { NoteAddOutlined, Settings } from "@mui/icons-material";
import { ToastContainer, toast } from "react-toastify";
import { dialog, invoke, path } from "@tauri-apps/api";

type Props = {};

type State = { settingsOpen: boolean };

class AppMenu extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  // @ts-ignore
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {
    settingsOpen: false,
  };

  render() {
    let { mainMenuOpen, toggleMainMenu } = this.context.model.uiState;
    return (
      <Drawer
        ModalProps={{ onBackdropClick: toggleMainMenu }}
        anchor="left"
        open={mainMenuOpen}
        onClose={(_) => {
          this.setState({ settingsOpen: false });
        }}
      >
        <div
          style={{
            width: "var(--sidebar-width)",
            backgroundColor: "var(--background-dark-gray)",
            height: "100%",
          }}
        >
          <div
            style={{
              flexShrink: 0,

              height: "var(--top-nav-height)",
              borderBottom: "thin solid var(--divider-gray)",
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-start",
              alignItems: "center",
              paddingLeft: 0,
              zIndex: 1000,
            }}
          >
            <Tooltip disableInteractive title="Main Menu">
              <IconButton
                onClick={() => {
                  toggleMainMenu();
                }}
              >
                <MenuIcon></MenuIcon>
              </IconButton>
            </Tooltip>
            Choreo
          </div>
          <List>
            <label htmlFor="file-upload-input">
              <ListItemButton
                onClick={() => {
                  invoke("open_file_dialog");
                }}
              >
                <ListItemIcon>
                  <UploadIcon />
                </ListItemIcon>
                <ListItemText primary="Open File"></ListItemText>
              </ListItemButton>
            </label>
            <ListItemButton
              onClick={() => {
                this.context.saveFileDialog();
              }}
            >
              <ListItemIcon>
                <SaveIcon />
              </ListItemIcon>
              <ListItemText
                primary={
                  this.context.model.uiState.hasSaveLocation
                    ? "Save File As"
                    : "Save File"
                }
              ></ListItemText>
            </ListItemButton>
            <ListItemButton
              onClick={async () => {
                if (
                  await dialog.confirm(
                    "You may lose unsaved changes. Continue?",
                    { title: "Choreo", type: "warning" }
                  )
                ) {
                  this.context.newFile();
                }
              }}
            >
              <ListItemIcon>
                <NoteAddOutlined />
              </ListItemIcon>
              <ListItemText primary="New File"></ListItemText>
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                this.context.exportActiveTrajectory();
              }}
            >
              <ListItemIcon>
                <FileDownload />
              </ListItemIcon>
              <ListItemText primary="Export Trajectory"></ListItemText>
            </ListItemButton>

            <ListItemButton
              onClick={async () => {
                if (!this.context.model.uiState.hasSaveLocation) {
                  if (
                    await dialog.ask(
                      "Saving trajectories to the deploy directory requires saving the project. Save it now?",
                      {
                        title: "Choreo",
                        type: "warning",
                      }
                    )
                  ) {
                    if (!(await this.context.saveFileDialog())) {
                      return;
                    }
                  } else {
                    return;
                  }
                }
                this.context.exportAllTrajectories();
              }}
            >
              <ListItemIcon>
                <SaveIcon />
              </ListItemIcon>
              <ListItemText primary="Save All Trajectories"></ListItemText>
            </ListItemButton>
            <ListItem>
              <div style={{ fontFamily: "monospace", fontSize: "0.75em" }}>
                {this.context.model.uiState.hasSaveLocation ? (
                  <>
                    Project saved at<br></br>
                    {this.context.model.uiState.saveFileDir}
                    {path.sep}
                    {this.context.model.uiState.saveFileName}
                    <br></br>
                    <br></br>
                    {this.context.model.uiState.isGradleProject
                      ? "Gradle (Java/C++) project detected."
                      : "Python project or no robot project detected."}
                    <br></br>
                    <br></br>
                    {this.context.model.uiState.hasSaveLocation ? (
                      <>
                        Trajectories saved in<br></br>
                        {this.context.model.uiState.saveFileDir}
                        {path.sep}
                        {this.context.model.uiState.chorRelativeTrajDir}
                      </>
                    ) : (
                      <>
                        <br />
                        <br />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Project not saved.
                    <br />
                    Click "Save File" above to save.
                  </>
                )}
              </div>
            </ListItem>
          </List>
          <ToastContainer
            position="top-right"
            autoClose={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            theme="dark"
            enableMultiContainer
            containerId={"MENU"}
          ></ToastContainer>
        </div>
      </Drawer>
    );
  }
}
export default observer(AppMenu);
