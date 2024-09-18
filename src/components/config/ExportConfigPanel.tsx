import { Switch } from "@mui/material";
import { observer } from "mobx-react";
import { Component } from "react";
import { doc } from "../../document/DocumentManager";
import inputStyles from "../input/InputList.module.css";

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
          Export Module Forces
        </span>
        <Switch
          size="small"
          sx={{ gridColumn: 2 }}
          checked={doc.pathlist.activePath.traj.forcesAvailable}
          onChange={(_e, checked) => {
            doc.pathlist.activePath.traj.setForcesAvailable(checked);
          }}
        ></Switch>
      </div>
    );
  }
}
export default observer(ExportConfigPanel);
