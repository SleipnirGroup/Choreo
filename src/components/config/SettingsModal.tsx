import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import { IconButton, Modal, Tab, Tabs } from "@mui/material";
import RobotConfigPanel from "./robotconfig/RobotConfigPanel";
import { Close } from "@mui/icons-material";

type Props = {};

type State = {};

class SettingsModal extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let config = this.context.model.document.robotConfig;
    let uiState = this.context.model.uiState;
    return (
      <Modal
        open={uiState.robotConfigOpen}
        onClose={() => uiState.setRobotConfigOpen(false)}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--background-light-gray)",
            color: "white",
            width: "min-content",
            padding: "8px",

            borderRadius: "10px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Tabs
              value={uiState.settingsTab}
              onChange={(e, newValue) => uiState.setSettingsTab(newValue)}
              centered
              textColor="inherit"
              sx={{
                ".MuiTabs-indicator": {
                  "background-color": "var(--select-yellow)",
                },
                ".Mui-selected": {
                  color: "white",
                },
                justifySelf: "center",
              }}
            >
              <Tab label="Robot Config" />
            </Tabs>
            <IconButton onClick={() => uiState.setRobotConfigOpen(false)}>
              <Close></Close>
            </IconButton>
          </div>
          <div style={{ paddingTop: 8, flexGrow: 1, overflowY: "scroll" }}>
            {uiState.settingsTab == 0 && <RobotConfigPanel></RobotConfigPanel>}
          </div>
        </div>
      </Modal>
    );
  }
}
export default observer(SettingsModal);
