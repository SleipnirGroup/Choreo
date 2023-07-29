import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import styles from "./WaypointConfigPanel.module.css";
import InputList from "../input/InputList";
import Input from "../input/Input";
import { Checkbox, FormControlLabel, IconButton } from "@mui/material";
import { ViewLabels } from "../../document/UIStateStore";
import { Visibility } from "@mui/icons-material";
import { Close } from "@mui/icons-material";

type Props = {};

type State = {};

class RobotConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};
  render() {
    let uiState = this.context.model.uiState;
    return (
      <div className={styles.VisibilityPanel}>
        <IconButton
          onClick={() => {
            uiState.setVisibilityPanelOpen(!uiState.visibilityPanelOpen);
          }}
        >
          {uiState.visibilityPanelOpen ? <Close /> : <Visibility />}
        </IconButton>
        {uiState.visibilityPanelOpen && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingRight: "8px",
            }}
          >
            {this.context.model.uiState.layers.map((value, index) => {
              return (
                <FormControlLabel
                  key={ViewLabels[index] + index}
                  label={ViewLabels[index]}
                  labelPlacement={"start"}
                  control={
                    <Checkbox
                      checked={value}
                      onChange={(e) =>
                        this.context.model.uiState.setLayerVisible(
                          index,
                          e.currentTarget.checked
                        )
                      }
                    />
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
export default observer(RobotConfigPanel);
