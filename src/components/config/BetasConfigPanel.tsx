import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import inputStyles from "../input/InputList.module.css";
import { Divider, MenuItem, Select, Switch, Tooltip } from "@mui/material";
import { Warning } from "@mui/icons-material";
import { PathGradients } from "./robotconfig/PathGradient";
import LocalStorageKeys from "../../util/LocalStorageKeys";

type Props = object;

type State = {
  selectedPathGradient: keyof typeof PathGradients;
};

class BetasConfigPanel extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  rowGap = 16;

  state = {
    selectedPathGradient: "Velocity" as keyof typeof PathGradients
  };

  render() {
    const pathGradientLocalStorage = localStorage.getItem(
      LocalStorageKeys.PATH_GRADIENT
    );
    if (pathGradientLocalStorage) {
      this.state.selectedPathGradient = pathGradientLocalStorage as keyof typeof PathGradients;
    }

    return (
      <div
        style={{
          minWidth: "600px",
          fontSize: "2rem",
          marginTop: `${1 * this.rowGap}px`,
          marginBottom: `${1 * this.rowGap}px`,
          marginRight: 0
        }}
      >
        <div
          style={{
            marginLeft: `${1 * this.rowGap}px`,
            marginRight: `${1 * this.rowGap}px`,
            marginTop: `${1 * this.rowGap}px`,
            marginBottom: `${1 * this.rowGap}px`
          }}
        >
          <span
            className={inputStyles.Title}
            style={{ display: "flex", gap: "4px" }}
          >
            <Warning></Warning>
            Warning: these features are still under development and may be
            unstable
          </span>
        </div>
        <Divider style={{ margin: `${1 * this.rowGap}px` }}></Divider>
        <div
          style={{
            marginLeft: `${1 * this.rowGap}px`,
            marginRight: `${1 * this.rowGap}px`
          }}
        >
          <span
            className={inputStyles.Title}
            style={{ verticalAlign: "middle" }}
          >
            Enable obstacles in the UI
          </span>
          <Tooltip
            title={
              "Warning: obstacles are still under development and may be unstable."
            }
          >
            <Switch
              size="small"
              sx={{ gridColumn: 2 }}
              checked={this.context.model.document.usesObstacles}
              onChange={(e, checked) => {
                this.context.model.setUsesObstacles(checked);
              }}
            ></Switch>
          </Tooltip>
        </div>
        <div
          style={{
            marginLeft: `${1 * this.rowGap}px`,
            marginRight: `${1 * this.rowGap}px`,
            marginTop: `${1 * this.rowGap}px`,
            marginBottom: `${1 * this.rowGap}px`
          }}
        >
          <span
            className={inputStyles.Title}
            style={{ verticalAlign: "middle", marginRight: "10px"}}
          >
            Path Gradient
          </span>
          <Select 
            defaultValue={PathGradients.Velocity.name}
            value={this.state.selectedPathGradient}
            onChange={(event) => {
              const key = event.target.value as keyof typeof PathGradients;
              this.setState({ selectedPathGradient: key });
              localStorage.setItem(LocalStorageKeys.PATH_GRADIENT, key);
            }}
          >
            {
              Object.keys(PathGradients).map((key) => (
                <MenuItem value={key}>
                  {PathGradients[key as keyof typeof PathGradients].name}
                </MenuItem>
              ))
            }
          </Select>
        </div>
      </div>
    );
  }
}
export default observer(BetasConfigPanel);
