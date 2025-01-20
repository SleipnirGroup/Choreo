import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { Component } from "react";
import { doc } from "../../document/DocumentManager";
import { observer } from "mobx-react";
import { MathNode } from "mathjs";
import { math } from "../../document/ExpressionStore";
type Props = {
  setXExpression: (expr: MathNode) => void;
  setYExpression: (expr: MathNode) => void;
  setHeadingExpression: (expr: MathNode) => void;
};
class PoseAssignToWaypointDropdown extends Component<Props, object> {
  render() {
    return (
      <Select
        size="small"
        variant="standard"
        value={""}
        renderValue={(_) => <></>}
        sx={{
          ".MuiSelect-select": {
            padding: "0px !important",
            height: "0px !important",
            paddingRight: "24px !important"
          }
        }}
        onChange={(e: SelectChangeEvent<string>) => {
          const poseName = e.target.value;
          if (!doc.variables.poses.has(poseName)) {
            return;
          }
          doc.history.startGroup(() => {
            try {
              this.props.setXExpression(math.parse(`${poseName}.x`));
              this.props.setYExpression(math.parse(`${poseName}.y`));
              this.props.setHeadingExpression(
                math.parse(`${poseName}.heading`)
              );
            } finally {
              doc.history.stopGroup();
            }
          });
        }}
      >
        {Array.from(doc.variables.poses.keys())
          .sort((a, b) =>
            a[0].toLocaleUpperCase() > b[0].toLocaleUpperCase() ? 1 : -1
          )
          .map((entry) => (
            <MenuItem value={entry}>{entry}</MenuItem>
          ))}
      </Select>
    );
  }
}
export default observer(PoseAssignToWaypointDropdown);
