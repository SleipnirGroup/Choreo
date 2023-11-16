import {
  Checkbox,
  CircularProgress,
  Dialog,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  List,
  Switch,
  TextField,
} from "@mui/material";
import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import styles from "./Sidebar.module.css";
import { Tooltip } from "@mui/material";
import { KeyboardArrowDown, Route, Settings } from "@mui/icons-material";
import Input from "../input/Input";
import InputList from "../input/InputList";
import { dialog } from "@tauri-apps/api";

type Props = {};

type State = {};

type OptionProps = { uuid: string };
type OptionState = {
  renaming: boolean;
  renameError: boolean;
  name: string;
  settingsOpen: boolean;
};

class PathSelectorOption extends Component<OptionProps, OptionState> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {
    renaming: false,
    renameError: false,
    name: this.getPath().name,
    settingsOpen: false,
  };
  nameInputRef = React.createRef<HTMLInputElement>();
  getSelected() {
    return (
      this.props.uuid == this.context.model.document.pathlist.activePathUUID
    );
  }
  getPath() {
    return this.context.model.document.pathlist.paths.get(this.props.uuid)!;
  }
  startRename() {
    this.setState({ renaming: true });
    this.nameInputRef.current!.value = this.getPath().name;
  }
  completeRename() {
    if (!this.checkName()) {
      this.getPath().setName(this.nameInputRef.current!.value);
    }
    this.escapeRename();
  }
  escapeRename() {
    this.setState({
      renaming: false,
      renameError: false,
      name: this.getPath().name,
    });
  }
  checkName(): boolean {
    let inputName = this.nameInputRef.current!.value;
    let error = this.searchForName(this.nameInputRef.current!.value);
    error = error || inputName.length == 0;
    this.setState({ renameError: error, name: inputName });
    return error;
  }
  searchForName(name: string): boolean {
    let didFind =
      Array.from(this.context.model.document.pathlist.paths.keys())
        .filter((uuid) => uuid !== this.props.uuid)
        .map(
          (uuid) => this.context.model.document.pathlist.paths.get(uuid)!.name
        )
        .find((existingName) => existingName === name) !== undefined;
    return didFind;
  }
  render() {
    // this is here to use the data we care about during actual rendering
    // so mobx knows to rerender this component when it changes
    this.searchForName("");
    let selected =
      this.props.uuid == this.context.model.document.pathlist.activePathUUID;
    let name = this.getPath().name;
    if (name != this.state.name) {
      this.setState({ name });
    }
    return (
      <span
        className={styles.SidebarItem + " " + (selected ? styles.Selected : "")}
        style={{ borderWidth: 0, borderLeftWidth: 4, height: "auto" }}
        onClick={() =>
          this.context.model.document.pathlist.setActivePathUUID(
            this.props.uuid
          )
        }
      >
        {this.getPath().generating ? (
          <CircularProgress
            size={20}
            sx={{
              color: selected ? "var(--select-yellow)" : "var(--accent-purple)",
              marginInline: "2px",
            }}
            variant="indeterminate"
          ></CircularProgress>
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
            height: "24px",
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
            style: { userSelect: "none" },
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
                borderBottom: "2px solid transparent",
              },
              width: "100%",
              height: "1.5em",
              userSelect: "none",
              padding: "4px",
            },
          }}
        ></TextField>
        <div>
          <Tooltip title="Path Config">
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
          <Tooltip title="Delete Path">
            <IconButton
              className={styles.SidebarRightIcon}
              onClick={(e) => {
                e.stopPropagation();
                dialog
                  .confirm(`Delete "${this.getPath().name}"?`)
                  .then((result) => {
                    if (result) {
                      this.context.model.document.pathlist.deletePath(
                        this.props.uuid
                      );
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
            <Tooltip title="Estimate needed resolution (# of samples) based on distance between waypoints">
              <FormControlLabel
                sx={{
                  marginLeft: "0px",
                  gridColumnStart: 2,
                  gridColumnEnd: 4,
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
            <span
              style={{
                borderLeft: "solid gray 1px",
                transform: "translate(12px, -4px)",
                height: "calc(100% + 8px)",
              }}
            ></span>
            <span style={{ gridColumnStart: 2, gridColumnEnd: 4 }}>
              <InputList noCheckbox>
                <Input
                  title="Default"
                  suffix="per segment"
                  showCheckbox={false}
                  enabled={!this.getPath().usesControlIntervalGuessing}
                  setEnabled={(_) => {}}
                  number={this.getPath().defaultControlIntervalCount}
                  setNumber={(count) => {
                    this.getPath().setDefaultControlIntervalCounts(count);
                  }}
                ></Input>
                {/**tooltip: When not guessing, how many control intervals to use? (default 40) */}
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
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  Option = observer(PathSelectorOption);
  render() {
    return (
      <div>
        <div className={styles.WaypointList}>
          {Array.from(this.context.model.document.pathlist.paths.keys()).map(
            (uuid) => (
              <this.Option uuid={uuid} key={uuid}></this.Option>
            )
          )}
        </div>
      </div>
    );
  }
}
export default observer(PathSelector);
