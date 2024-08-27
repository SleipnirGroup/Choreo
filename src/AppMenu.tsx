import {
  CopyAll,
  NoteAddOutlined,
  OpenInNew,
  Settings
} from "@mui/icons-material";
import FileDownload from "@mui/icons-material/FileDownload";
import MenuIcon from "@mui/icons-material/Menu";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/UploadFile";
import {
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { dialog, path } from "@tauri-apps/api";
import { observer } from "mobx-react";
import { Component } from "react";
import { toast } from "react-toastify";
import {
  exportActiveTrajectory,
  exportAllTrajectories,
  newFile,
  openProject,
  saveFileDialog,
  uiState
} from "./document/DocumentManager";

import SettingsModal from "./components/config/SettingsModal";
import { Commands } from "./document/tauriCommands";
import { version } from "./util/version";

type Props = object;

type State = { settingsOpen: boolean };

class AppMenu extends Component<Props, State> {
  state = {
    settingsOpen: false
  };

  private convertToRelative(filePath: string): string {
    return filePath.replace(
      RegExp(
        `^(?:C:)?\\${path.sep}(Users|home)\\${path.sep}[a-zA-Z]+\\${path.sep}`
      ),
      "~" + path.sep
    );
  }

  CopyToClipboardButton({ data, tooltip }: { data: any; tooltip: string }) {
    const handleAction = async function () {
      await navigator.clipboard.writeText(data);
      toast.success("Copied to clipboard");
    };

    return (
      <Tooltip disableInteractive title={tooltip}>
        <IconButton size="small" onClick={handleAction}>
          <CopyAll fontSize="small"></CopyAll>
        </IconButton>
      </Tooltip>
    );
  }

  OpenInFilesApp({ dir }: { dir: string }) {
    const handleAction = async function () {
      await Commands.openInExplorer(dir);
    };

    return (
      <Tooltip disableInteractive title="Reveal in Files App">
        <IconButton size="small" onClick={handleAction}>
          <OpenInNew fontSize="small"></OpenInNew>
        </IconButton>
      </Tooltip>
    );
  }

  render() {
    const { mainMenuOpen, toggleMainMenu } = uiState;
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
            height: "100%"
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
              zIndex: 1000
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
            Choreo v{version}
          </div>
          <List style={{ paddingBottom: "50px", paddingTop: "0px" }}>
            {/* Document Settings (open the robot config, etc modal) */}
            <Tooltip
              disableInteractive
              title="Robot configuration and other settings"
            >
              <ListItemButton onClick={() => uiState.setRobotConfigOpen(true)}>
                <ListItemIcon>
                  <Settings />
                </ListItemIcon>
                <ListItemText primary="Document Settings"></ListItemText>
              </ListItemButton>
            </Tooltip>
            <Divider></Divider>
            {/* Open File */}
            <ListItemButton
              onClick={async () => {
                if (
                  await dialog.confirm(
                    "You may lose unsaved changes. Continue?",
                    { title: "Choreo", type: "warning" }
                  )
                ) {
                  await Commands.openFileDialog().then((filepath) =>
                    openProject(filepath)
                  );
                }
              }}
            >
              <ListItemIcon>
                <UploadIcon />
              </ListItemIcon>
              <ListItemText primary="Open File"></ListItemText>
            </ListItemButton>
            {/* Save File */}
            <ListItemButton
              onClick={async () => {
                saveFileDialog();
              }}
            >
              <ListItemIcon>
                <SaveIcon />
              </ListItemIcon>
              <ListItemText
                primary={uiState.hasSaveLocation ? "Save File As" : "Save File"}
              ></ListItemText>
            </ListItemButton>
            {/* New File */}
            <ListItemButton
              onClick={async () => {
                if (
                  await dialog.confirm(
                    "You may lose unsaved changes. Continue?",
                    { title: "Choreo", type: "warning" }
                  )
                ) {
                  newFile();
                }
              }}
            >
              <ListItemIcon>
                <NoteAddOutlined />
              </ListItemIcon>
              <ListItemText primary="New File"></ListItemText>
            </ListItemButton>
            {/* Export Active Trajectory */}
            <ListItemButton
              onClick={() => {
                toast.promise(exportActiveTrajectory(), {
                  pending: "Exporting trajectory...",
                  success: "Trajectory exported",
                  error: {
                    render(toastProps) {
                      console.error(toastProps.data);
                      return `Error exporting trajectory: ${toastProps.data}`;
                    }
                  }
                });
              }}
            >
              <ListItemIcon>
                <FileDownload />
              </ListItemIcon>
              <ListItemText primary="Export Trajectory"></ListItemText>
            </ListItemButton>
            {/* Export All to Deploy */}
            <ListItemButton
              onClick={async () => {
                if (!uiState.hasSaveLocation) {
                  if (
                    await dialog.ask(
                      "Saving trajectories to the deploy directory requires saving the project. Save it now?",
                      {
                        title: "Choreo",
                        type: "warning"
                      }
                    )
                  ) {
                    if (!(await saveFileDialog())) {
                      return;
                    }
                  } else {
                    return;
                  }
                }

                toast.promise(exportAllTrajectories(), {
                  success: `Saved all trajectories to ${uiState.chorRelativeTrajDir}.`,
                  error: {
                    render(toastProps) {
                      console.error(toastProps.data);
                      return `Couldn't export trajectories: ${
                        toastProps.data as string[]
                      }`;
                    }
                  }
                });
              }}
            >
              <ListItemIcon>
                <SaveIcon />
              </ListItemIcon>
              <ListItemText primary="Save All Trajectories"></ListItemText>
            </ListItemButton>
            <Divider orientation="horizontal"></Divider>
            {/* Info about save locations */}
            <ListItem>
              <div
                style={{
                  overflowWrap: "break-word",
                  fontSize: "1.0em",
                  width: "100%"
                }}
              >
                {uiState.hasSaveLocation ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>Project saved at</span>
                      <span>
                        <this.CopyToClipboardButton
                          data={this.projectLocation(false)}
                          tooltip="Copy full path to clipboard"
                        ></this.CopyToClipboardButton>
                        <this.OpenInFilesApp
                          dir={this.projectLocation(false)}
                        ></this.OpenInFilesApp>
                      </span>
                    </div>
                    <div style={{ fontSize: "0.9em", color: "#D3D3D3" }}>
                      {this.projectLocation(true)}
                    </div>
                    <br></br>
                    {uiState.isGradleProject
                      ? "Gradle (Java/C++) project detected."
                      : "Python project or no robot project detected."}
                    <br></br>
                    <br></br>
                    <div></div>
                    {uiState.hasSaveLocation ? (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <span>Trajectories saved in</span>
                          <span>
                            <this.CopyToClipboardButton
                              data={this.trajectoriesLocation(false)}
                              tooltip="Copy full path to clipboard"
                            ></this.CopyToClipboardButton>
                            <this.OpenInFilesApp
                              dir={this.trajectoriesLocation(false)}
                            ></this.OpenInFilesApp>
                          </span>
                        </div>
                        <div style={{ fontSize: "0.9em", color: "#D3D3D3" }}>
                          {this.trajectoriesLocation(true)}
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
          <SettingsModal></SettingsModal>
        </div>
      </Drawer>
    );
  }

  private projectLocation(relativeFormat: boolean): string {
    return (
      (relativeFormat
        ? this.convertToRelative(uiState.saveFileDir as string)
        : uiState.saveFileDir) + path.sep
    );
  }

  private trajectoriesLocation(relativeFormat: boolean): string {
    return (
      this.projectLocation(relativeFormat) +
      uiState.chorRelativeTrajDir +
      path.sep
    );
  }
}
export default observer(AppMenu);
