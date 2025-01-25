import { Autocomplete, createFilterOptions, TextField } from "@mui/material";
import { Component } from "react";
import { doc } from "../../document/DocumentManager";
import { observer } from "mobx-react";
import { MathNode } from "mathjs";
import { math } from "../../document/ExpressionStore";
type Props = {
  setXExpression: (expr: MathNode) => void;
  setYExpression: (expr: MathNode) => void;
  setHeadingExpression: (expr: MathNode) => void;
  onDefinePose: (variableName: string) => void;
  poses: readonly PoseVariableWithCustom[];
  allowDefinePose: boolean;
};
export interface PoseVariableWithCustom {
  isAdd?: boolean;
  title: string;
  variableName: string;
}
const filter = createFilterOptions<PoseVariableWithCustom>();
type State = {
  recreateCounter: number;
};
class PoseAssignToWaypointDropdown extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { recreateCounter: 0 };
  }
  render() {
    // TODO memoize
    const options = this.props.poses;
    return (
      <Autocomplete
        key={this.state.recreateCounter}
        size="small"
        options={options}
        getOptionLabel={(option) => {
          // Value selected with enter, right from the input
          if (typeof option === "string") {
            return option;
          }
          return option.variableName;
        }}
        renderInput={(params) => {
          return (
            <TextField
              variant="standard"
              sx={{
                fontFamily: "Roboto Mono Variable",
                textAlign: "right"
              }}
              placeholder="Pose Variable"
              {...params}
            />
          );
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
        disableClearable
        autoHighlight
        onChange={(e: any, newValue: PoseVariableWithCustom | null) => {
          if (newValue === null) {
            return;
          }

          const poseName = newValue.variableName;
          if (
            this.props.allowDefinePose &&
            !doc.variables.poses.has(poseName)
          ) {
            if (newValue.isAdd) {
              console.log(newValue.variableName);
              this.props.onDefinePose(newValue.variableName);
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
          this.setState({ recreateCounter: this.state.recreateCounter + 1 });
        }}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          if (this.props.allowDefinePose) {
            const { inputValue } = params;
            // Suggest the creation of a new value
            const isExisting = options.some(
              (option) => inputValue === option.title
            );
            if (inputValue !== "" && !isExisting) {
              filtered.push({
                isAdd: true,
                title: `Add this pose as "${inputValue}"`,
                variableName: inputValue
              });
            }
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
