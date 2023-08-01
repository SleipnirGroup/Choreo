import { IconButton, TextField } from "@mui/material";
import { observer } from "mobx-react";
import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import styles from "./Sidebar.module.css";
import { Tooltip } from "@mui/material";
import { Route } from "@mui/icons-material";

type Props = {};

type State = {};

type OptionProps = { uuid: string };
type OptionState = { renaming: boolean; renameError: boolean; name: string };

class PathSelectorOption extends Component<OptionProps, OptionState> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = { renaming: false, renameError: false, name: this.getPath().name };
  nameInputRef = React.createRef<HTMLInputElement>();
  getSelected() {
    return this.props.uuid == this.context.model.pathlist.activePathUUID;
  }
  getPath() {
    return this.context.model.pathlist.paths.get(this.props.uuid)!;
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
      Array.from(this.context.model.pathlist.paths.keys())
        .filter((uuid) => uuid !== this.props.uuid)
        .map((uuid) => this.context.model.pathlist.paths.get(uuid)!.name)
        .find((existingName) => existingName === name) !== undefined;
    return didFind;
  }
  render() {
    // this is here to use the data we care about during actual rendering
    // so mobx knows to rerender this component when it changes
    this.searchForName("");
    let selected =
      this.props.uuid == this.context.model.pathlist.activePathUUID;
    return (
      <span
        className={styles.SidebarItem + " " + (selected ? styles.Selected : "")}
        style={{ borderWidth: 0, borderLeftWidth: 4 }}
        onClick={() =>
          this.context.model.pathlist.setActivePathUUID(this.props.uuid)
        }
      >
        <Route
          className={styles.SidebarIcon}
          htmlColor={selected ? "var(--select-yellow)" : "var(--accent-purple)"}
        />
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
          onBlur={() => this.escapeRename()}
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
        <Tooltip title="Delete Path">
          <IconButton
            className={styles.SidebarRightIcon}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${this.getPath().name}"?`)) {
                this.context.model.pathlist.deletePath(this.props.uuid);
              }
            }}
          >
            <DeleteIcon></DeleteIcon>
          </IconButton>
        </Tooltip>
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
          {Array.from(this.context.model.pathlist.paths.keys()).map((uuid) => (
            <this.Option uuid={uuid} key={uuid}></this.Option>
          ))}
        </div>
      </div>
    );
  }
}
export default observer(PathSelector);
