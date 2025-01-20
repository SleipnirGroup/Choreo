import { Autocomplete, createFilterOptions, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";
import { Component } from "react";
import { doc } from "../../document/DocumentManager";
import { observer } from "mobx-react";
import { MathNode } from "mathjs";
import { math } from "../../document/ExpressionStore";
import Waypoint from "../../assets/Waypoint";
type Props = {
  setXExpression: (expr: MathNode) => void;
  setYExpression: (expr: MathNode) => void;
  setHeadingExpression: (expr: MathNode) => void;
  onDefinePose: (variableName: string) => void;
  poses: readonly PoseVariableWithCustom[];
};
export interface PoseVariableWithCustom {
  isAdd?: boolean;
  title: string;
  variableName: string;
}
const filter = createFilterOptions<PoseVariableWithCustom>();
class PoseAssignToWaypointDropdown extends Component<Props, object> {
  
  render() {
     // TODO memoize
    let options = this.props.poses;
    return (
      <Autocomplete
      size="small"
  options={options}
  getOptionLabel={(option) => {
    // Value selected with enter, right from the input
    if (typeof option === 'string') {
      return option;
    }
    return option.variableName;
  }}
  sx={{ width: 300 }}
  renderInput={(params) => {
    return (<TextField {...params} label="Pose" />);
  }}
  renderOption={(props, option) => {
    const { key, ...optionProps } = props;
    return (
      <li key={key} {...optionProps}>
        {option.title}
      </li>
    );
  }}
  selectOnFocus
  clearOnBlur
  handleHomeEndKeys
  onChange={(e:any, newValue: PoseVariableWithCustom|null) => {
        if (newValue === null) {
          return;
        }

        const poseName = newValue.variableName;
        if (!doc.variables.poses.has(poseName)) {
          if (newValue.isAdd) {
            console.log(newValue.variableName);
            this.props.onDefinePose(newValue.variableName)
          }
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
      filterOptions={(options, params) => {
        const filtered = filter(options, params);

        const { inputValue } = params;
        // Suggest the creation of a new value
        const isExisting = options.some((option) => inputValue === option.title);
        if (inputValue !== '' && !isExisting) {
          filtered.push({
            isAdd: true,
            title: `Add this pose as "${inputValue}"`,
            variableName: inputValue
          });
        }

        return filtered;
      }}
/>
      // <Select
      //   size="small"
      //   variant="standard"
      //   defaultValue=" "
      //   renderValue={(_) => 
      //       <Waypoint></Waypoint>
      //   }
      //   sx={{
      //     ".MuiSelect-select": {
      //       padding: "0px !important",
      //       height: "0px !important",
      //       paddingRight: "24px !important"
      //     }
      //   }}
      //   onChange={(e: SelectChangeEvent<string>) => {
      //     const poseName = e.target.value;
      //     if (!doc.variables.poses.has(poseName)) {
      //       return;
      //     }
      //     doc.history.startGroup(() => {
      //       try {
      //         this.props.setXExpression(math.parse(`${poseName}.x`));
      //         this.props.setYExpression(math.parse(`${poseName}.y`));
      //         this.props.setHeadingExpression(
      //           math.parse(`${poseName}.heading`)
      //         );
      //       } finally {
      //         doc.history.stopGroup();
      //       }
      //     });
      //   }}
      // >
      //   {Array.from(doc.variables.poses.keys())
      //     .sort((a, b) =>
      //       a[0].toLocaleUpperCase() > b[0].toLocaleUpperCase() ? 1 : -1
      //     )
      //     .map((entry) => (
      //       <MenuItem value={entry}>{entry}</MenuItem>
      //     ))}
      // </Select>
    );
  }
}
export default observer(PoseAssignToWaypointDropdown);
