import {
  KeyboardArrowDown,
  PriorityHigh,
  Route,
  Settings
} from "@mui/icons-material";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  TextField,
  Tooltip
} from "@mui/material";
import { dialog } from "@tauri-apps/api";
import { observer } from "mobx-react";
import React, { Component } from "react";
import { toast } from "react-toastify";
import { deletePath, doc, renamePath } from "../../document/DocumentManager";
import Input from "../input/Input";
import InputList from "../input/InputList";
import styles from "./Sidebar.module.css";

type Props = object;

type State = object;

type OptionProps = { uuid: string };
type OptionState = {
  renaming: boolean;
  renameError: boolean;
  name: string;
  settingsOpen: boolean;
};

class PathSelectorOption extends Component<OptionProps, OptionState> {
  state = {
    renaming: false,
    renameError: false,
    name: this.getPath().name,
    settingsOpen: false
  };
  nameInputRef = React.createRef<HTMLInputElement>();
  getSelected() {
    return this.props.uuid == doc.pathlist.activePathUUID;
  }
  getPath() {
    return doc.pathlist.paths.get(this.props.uuid)!;
  }
  startRename() {
    this.setState({ renaming: true });
    this.nameInputRef.current!.value = this.getPath().name;
  }
  completeRename() {
    if (!this.checkName()) {
      renamePath(this.props.uuid, this.nameInputRef.current!.value);
    }
    this.escapeRename();
  }
  escapeRename() {
    this.setState({
      renaming: false,
      renameError: false,
      name: this.getPath().name
    });
  }
  checkName(): boolean {
    const inputName = this.nameInputRef.current!.value;
    const error =
      inputName.length == 0 ||
      inputName.includes("/") ||
      inputName.includes("\\") ||
      inputName.includes(".") ||
      this.searchForName(this.nameInputRef.current!.value);
    this.setState({ renameError: error, name: inputName });
    return error;
  }
  searchForName(name: string): boolean {
    const didFind =
      Array.from(doc.pathlist.paths.keys())
        .filter((uuid) => uuid !== this.props.uuid)
        .map((uuid) => doc.pathlist.paths.get(uuid)!.name)
        .find((existingName) => existingName === name) !== undefined;
    return didFind;
  }
  render() {
    // this is here to use the data we care about during actual rendering
    // so mobx knows to rerender this component when it changes
    this.searchForName("");
    const selected = this.props.uuid == doc.pathlist.activePathUUID;
    const name = this.getPath().name;
    if (name != this.state.name && !this.state.renaming) {
      this.state.name = name;
    }
    return (
      <span
        className={styles.SidebarItem + " " + (selected ? styles.Selected : "")}
        style={{ borderWidth: 0, borderLeftWidth: 4, height: "auto" }}
        onClick={() => {
          toast.dismiss(); // remove toasts that showed from last path, which is irrelevant for the new path

          doc.pathlist.setActivePathUUID(this.props.uuid);
        }}
      >
        {this.getPath().ui.generating ? (
          <CircularProgress
            size={20}
            sx={{
              color: selected ? "var(--select-yellow)" : "var(--accent-purple)",
              marginInline: "2px"
            }}
            variant="indeterminate"
          ></CircularProgress>
        ) : this.getPath().isTrajectoryStale ? (
          <Tooltip
            disableInteractive
            title="Path features no longer match trajectory. Regenerate to be up-to-date."
          >
            <PriorityHigh
              className={styles.SidebarIcon}
              htmlColor={
                selected ? "var(--select-yellow)" : "var(--accent-purple)"
              }
            ></PriorityHigh>
          </Tooltip>
        ) : (
          <Route
            className={styles.SidebarIcon}
            htmlColor={
              selected ? "var(--select-yellow)" : "var(--accent-purple)"
            }
          />
        )}

        <TextField
          className={styles.SidebarLabel}
          variant={this.state.renaming ? "outlined" : "standard"}
          inputRef={this.nameInputRef}
          error={this.state.renameError}
          style={{
            display: "block",
            maxWidth: "100%",
            flexGrow: "1",
            verticalAlign: "middle",
            userSelect: "none",
            height: "24px"
          }}
          spellCheck={false}
          onChange={() => this.checkName()}
          value={this.state.name}
          onKeyDown={(event) => {
            if (event.key == "Enter") {
              this.completeRename();
              this.nameInputRef.current!.blur();
            }
            if (event.key == "Escape") {
              this.escapeRename();
            }
          }}
          inputProps={{
            readOnly: !this.state.renaming,
            style: { userSelect: "none" }
          }}
          InputProps={{ disableUnderline: false }}
          onFocus={(e) => {
            e.preventDefault();
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startRename();
            this.nameInputRef.current!.focus();
          }}
          onBlur={() => this.completeRename()}
          onDoubleClickCapture={(e) => {
            e.stopPropagation();
            this.startRename();
            setTimeout(() => this.nameInputRef.current!.select(), 0.001);
          }}
          sx={{
            // ".MuiInputBase-root-MuiInput-root:before": {
            //   borderBottom: "2px solid transparent",
            // "&:hover": {
            //   borderBottom: "2px solid white",
            // },
            // },
            marginLeft: "-4px",
            ".MuiInputBase-root": {
              "&:before": {
                borderBottom: "2px solid transparent"
              },
              width: "100%",
              height: "1.5em",
              userSelect: "none",
              padding: "4px"
            }
          }}
        ></TextField>
        <div>
          <Tooltip disableInteractive title="Path Config">
            <IconButton
              className={styles.SidebarRightIcon}
              onClick={(e) => {
                e.stopPropagation();
                this.setState({ settingsOpen: !this.state.settingsOpen });
              }}
            >
              {this.state.settingsOpen ? (
                <KeyboardArrowDown></KeyboardArrowDown>
              ) : (
                <Settings></Settings>
              )}
            </IconButton>
          </Tooltip>
          <Tooltip disableInteractive title="Delete Path">
            <IconButton
              className={styles.SidebarRightIcon}
              onClick={(e) => {
                e.stopPropagation();
                dialog
                  .confirm(`Delete "${this.getPath().name}"?`)
                  .then((result) => {
                    if (result) {
                      deletePath(this.props.uuid);
                    }
                  });
              }}
            >
              <DeleteIcon></DeleteIcon>
            </IconButton>
          </Tooltip>
        </div>
        {/* Settings part */}
        {this.state.settingsOpen && (
          <>
            <span className={styles.SidebarVerticalLine}></span>
            <Tooltip
              disableInteractive
              title="Estimate needed resolution (# of samples) based on distance between waypoints"
            >
              <FormControlLabel
                sx={{
                  marginLeft: "0px",
                  gridColumnStart: 2,
                  gridColumnEnd: 4
                }}
                label="Guess Path Detail"
                control={
                  <Checkbox
                    checked={this.getPath().usesControlIntervalGuessing}
                    onChange={(e) => {
                      this.getPath().setControlIntervalGuessing(
                        e.target.checked
                      );
                    }}
                  />
                }
              />
            </Tooltip>
            <span className={styles.SidebarVerticalLine}></span>
            <span style={{ gridColumnStart: 2, gridColumnEnd: 4 }}>
              <InputList noCheckbox>
                <Input
                  title="Default"
                  suffix="per segment"
                  showCheckbox={false}
                  enabled={!this.getPath().usesControlIntervalGuessing}
                  setEnabled={(_) => {}}
                  roundingPrecision={0}
                  number={this.getPath().defaultControlIntervalCount}
                  setNumber={(count) => {
                    this.getPath().setDefaultControlIntervalCounts(count);
                  }}
                  titleTooltip="When not guessing, how many samples to use?"
                ></Input>
              </InputList>
            </span>
            {/* </FormGroup> */}
            {/* <div
              style={{
                padding:"16px"
              }}>
                <TextField
                    label="Default Control Interval Count"
                    title="When not guessing, how many control intervals to use? (default 40)"
                    defaultValue={this.getPath().defaultControlIntervalCount}
                    inputMode="numeric"
                    onChange={(e) => {this.getPath().setDefaultControlIntervalCounts(parseInt(e.target.value))}}
                    fullWidth
                  ></TextField>
                </div></> */}
          </>
        )}
      </span>
    );
  }
}

class PathSelector extends Component<Props, State> {
  state = {};

  Option = observer(PathSelectorOption);
  render() {
    return (
      <div>
        <div className={styles.WaypointList}>
          {Array.from(doc.pathlist.paths.keys()).map((uuid) => (
            <this.Option uuid={uuid} key={uuid}></this.Option>
          ))}
        </div>
      </div>
    );
  }
}
export default observer(PathSelector);
