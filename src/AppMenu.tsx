import React, { Component } from "react";
import DocumentManagerContext from "./document/DocumentManager";
import { observer } from "mobx-react";
import {
  Dialog,
  DialogTitle,
  Divider,
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
import FileCopyIcon from "@mui/icons-material/FileCopy";
import Tooltip from "@mui/material/Tooltip";
import { CopyAll, NoteAddOutlined, Settings } from "@mui/icons-material";
import { ToastContainer, toast } from "react-toastify";
import { dialog, invoke, path } from "@tauri-apps/api";

import * as nodePath from "path";

type Props = {};

type State = { settingsOpen: boolean };

class AppMenu extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  // @ts-ignore
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {
    settingsOpen: false,
  };

  private convertToRelative(filePath: string): string {
    return filePath.replace(
      RegExp(`^(?:C:)?\\${path.sep}Users\\${path.sep}[a-zA-Z]+\\${path.sep}`),
      "~/"
    );
  }

  CopyToClipboardButton({ data }: { data: any }) {
    let handleCopyToClipboard = async function () {
      await navigator.clipboard.writeText(data);
      toast.success("Copied to clipboard");
    };

    return (
      <IconButton size="small" onClick={handleCopyToClipboard}>
        <CopyAll fontSize="small"></CopyAll>
      </IconButton>
    );
  }

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
          <List style={{ paddingBottom: "50px" }}>
            <label htmlFor="file-upload-input">
              <ListItemButton
                onClick={async () => {
                  if (
                    await dialog.confirm(
                      "You may lose unsaved changes. Continue?",
                      { title: "Choreo", type: "warning" }
                    )
                  ) {
                    invoke("open_file_dialog");
                  }
                }}
              >
                <ListItemIcon>
                  <UploadIcon />
                </ListItemIcon>
                <ListItemText primary="Open File"></ListItemText>
              </ListItemButton>
            </label>
            <ListItemButton
              onClick={async () => {
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
                toast.promise(this.context.exportActiveTrajectory(), {
                  pending: "Exporting trajectory...",
                  success: "Trajectory exported",
                  error: {
                    render(toastProps) {
                      console.error(toastProps.data);
                      return `Error exporting trajectory: ${toastProps.data}`;
                    },
                  },
                });
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

                toast.promise(this.context.exportAllTrajectories(), {
                  success: `Saved all trajectories to ${this.context.model.uiState.chorRelativeTrajDir}.`,
                  error: {
                    render(toastProps) {
                      console.error(toastProps.data);
                      return (toastProps.data as string[]).join("\n");
                    },
                  },
                });
              }}
            >
              <ListItemIcon>
                <SaveIcon />
              </ListItemIcon>
              <ListItemText primary="Save All Trajectories"></ListItemText>
            </ListItemButton>
            <Divider orientation="horizontal"></Divider>
            <ListItem>
              <div
                style={{
                  overflowWrap: "break-word",
                  fontSize: "1.0em",
                  width: "100%",
                }}
              >
                {this.context.model.uiState.hasSaveLocation ? (
                  <>
                    Project saved at<br></br>
                    <div style={{ fontSize: "0.9em", color: "#D3D3D3" }}>
                      {this.projectLocation(true)}
                      <Tooltip title="Copy full path to clipboard">
                        <this.CopyToClipboardButton
                          data={this.projectLocation(false)}
                        ></this.CopyToClipboardButton>
                      </Tooltip>
                    </div>
                    <br></br>
                    {this.context.model.uiState.isGradleProject
                      ? "Gradle (Java/C++) project detected."
                      : "Python project or no robot project detected."}
                    <br></br>
                    <br></br>
                    <div></div>
                    {this.context.model.uiState.hasSaveLocation ? (
                      <>
                        Trajectories saved in<br></br>
                        <div style={{ fontSize: "0.9em", color: "#D3D3D3" }}>
                          {this.trajectoriesLocation(true)}
                          <Tooltip
                            disableInteractive
                            title="Copy full path to clipboard"
                          >
                            <this.CopyToClipboardButton
                              data={this.trajectoriesLocation(false)}
                            ></this.CopyToClipboardButton>
                          </Tooltip>
                        </div>
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
        </div>
      </Drawer>
    );
  }

  private projectLocation(relativeFormat: boolean): string {
    return (
      (relativeFormat
        ? this.convertToRelative(
            this.context.model.uiState.saveFileDir as string
          )
        : this.context.model.uiState.saveFileDir) + path.sep
    );
  }

  private trajectoriesLocation(relativeFormat: boolean): string {
    return (
      this.projectLocation(relativeFormat) +
      this.context.model.uiState.chorRelativeTrajDir +
      path.sep
    );
  }
}
export default observer(AppMenu);
