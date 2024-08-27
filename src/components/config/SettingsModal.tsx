import { Close } from "@mui/icons-material";
import { Fade, IconButton, Modal, Tab, Tabs } from "@mui/material";
import { observer } from "mobx-react";
import { Component } from "react";
import { uiState } from "../../document/DocumentManager";
import BetasConfigPanel from "./BetasConfigPanel";
import KeyboardShortcutsPanel from "./KeyboardShortcutsPanel";
import RobotConfigPanel from "./robotconfig/RobotConfigPanel";

type Props = object;

type State = object;

class SettingsModal extends Component<Props, State> {
  state = {};
  render() {
    return (
      <Modal
        open={uiState.robotConfigOpen}
        onClose={() => uiState.setRobotConfigOpen(false)}
        closeAfterTransition
      >
        <Fade in={uiState.robotConfigOpen}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--background-light-gray)",
              color: "white",
              width: "min-content",
              // padding: "8px",

              borderRadius: "10px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between"
              }}
            >
              <Tabs
                value={uiState.settingsTab}
                onChange={(e, newValue) => uiState.setSettingsTab(newValue)}
                centered
                textColor="inherit"
                sx={{
                  ".MuiTabs-indicator": {
                    "background-color": "var(--select-yellow)"
                  },
                  ".Mui-selected": {
                    color: "white"
                  },
                  justifySelf: "center",
                  marginTop: "8px",
                  marginRight: "8px",
                  marginLeft: "8px"
                }}
              >
                <Tab label="Robot Config" />
                {/* <Tab label="Export Config" /> */}
                <Tab label="Controls" />
                <Tab label="Betas" />
              </Tabs>
              <IconButton onClick={() => uiState.setRobotConfigOpen(false)}>
                <Close></Close>
              </IconButton>
            </div>
            <div style={{ paddingTop: 8, flexGrow: 1, overflowY: "scroll" }}>
              {uiState.settingsTab == 0 && (
                <RobotConfigPanel></RobotConfigPanel>
              )}
              {/* {uiState.settingsTab == 1 && (
                <ExportConfigPanel></ExportConfigPanel>
              )} */}
              {uiState.settingsTab == 1 && (
                <KeyboardShortcutsPanel></KeyboardShortcutsPanel>
              )}
              {uiState.settingsTab == 2 && (
                <BetasConfigPanel></BetasConfigPanel>
              )}
            </div>
          </div>
        </Fade>
      </Modal>
    );
  }
}
export default observer(SettingsModal);
