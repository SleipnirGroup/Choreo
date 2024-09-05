import {
  CopyAll,
  NoteAddOutlined,
  OpenInNew,
  Settings
} from "@mui/icons-material";
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
  newProject,
  openProject,
  saveProjectDialog,
  uiState,
  openDiagnosticZipWithInfo
} from "./document/DocumentManager";

import SettingsModal from "./components/config/SettingsModal";
import { Commands } from "./document/tauriCommands";
import { version } from "./util/version";

type Props = object;

type State = object;

class AppMenu extends Component<Props, State> {
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
        anchor="left"
        open={mainMenuOpen}
        onClose={(_) => {
          uiState.setMainMenuOpen(false);
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
            {/* Open Project */}
            <ListItemButton
              onClick={async () => {
                if (
                  await dialog.confirm(
                    "You may lose unsaved changes. Continue?",
                    { title: "Choreo", type: "warning" }
                  )
                ) {
                  await Commands.openProjectDialog().then((filepath) =>
                    openProject(filepath)
                  );
                }
              }}
            >
              <ListItemIcon>
                <UploadIcon />
              </ListItemIcon>
              <ListItemText primary="Open Project"></ListItemText>
            </ListItemButton>
            {/* Save Project */}
            <ListItemButton
              onClick={async () => {
                saveProjectDialog();
              }}
            >
              <ListItemIcon>
                <SaveIcon />
              </ListItemIcon>
              <ListItemText
                primary={
                  uiState.hasSaveLocation ? "Save Project As" : "Save Project"
                }
              ></ListItemText>
            </ListItemButton>
            {/* New Project */}
            <ListItemButton
              onClick={async () => {
                if (
                  await dialog.confirm(
                    "You may lose unsaved changes. Continue?",
                    { title: "Choreo", type: "warning" }
                  )
                ) {
                  newProject();
                }
              }}
            >
              <ListItemIcon>
                <NoteAddOutlined />
              </ListItemIcon>
              <ListItemText primary="New Project"></ListItemText>
            </ListItemButton>
            {/* Export Diagnostic Report */}
            <ListItemButton
              onClick={async () => {
                openDiagnosticZipWithInfo();
              }}
            >
              <ListItemIcon>
                <SaveIcon />
              </ListItemIcon>
              <ListItemText primary="Export Diagnostic Report"></ListItemText>
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
                  </>
                ) : (
                  <>
                    Project not saved.
                    <br />
                    Click "Save Project" above to save.
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
        ? this.convertToRelative(uiState.projectDir as string)
        : uiState.projectDir) + path.sep
    );
  }
}
export default observer(AppMenu);
