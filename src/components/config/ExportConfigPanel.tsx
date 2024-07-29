import { observer } from "mobx-react";
import React, { Component } from "react";
import {clearAllTrajectories, doc, exportAllTrajectories, uiState} from "../../document/DocumentManager";
import inputStyles from "../input/InputList.module.css";
import { Switch } from "@mui/material";

type Props = object;

type State = object;

class ExportConfigPanel extends Component<Props, State> {
  

  rowGap = 16;
  render() {
    return (
      <div
        style={{
          minWidth: "600px",
          rowGap: `${0 * this.rowGap}px`,
          fontSize: "2rem",
          margin: `${1 * this.rowGap}px`
        }}
      >
        <span className={inputStyles.Title} style={{ gridColumn: "1" }}>
          Split .traj files at stop points
        </span>
        <Switch
          size="small"
          sx={{ gridColumn: 2 }}
          checked={doc.splitTrajectoriesAtStopPoints}
          onChange={(e, checked) => {
            doc.setSplitTrajectoriesAtStopPoints(checked);
            clearAllTrajectories();
            exportAllTrajectories();
          }}
        ></Switch>
      </div>
    );
  }
}
export default observer(ExportConfigPanel);
