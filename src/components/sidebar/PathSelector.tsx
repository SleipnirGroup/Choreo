import {
  KeyboardArrowDown,
  PriorityHigh,
  Route,
  Settings,
  ShapeLine
} from "@mui/icons-material";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, InputAdornment, TextField, Tooltip } from "@mui/material";
import { confirm } from "@tauri-apps/plugin-dialog";
import { observer } from "mobx-react";
import React, { Component } from "react";
import { toast } from "react-toastify";
import { deletePath, doc, renamePath } from "../../document/DocumentManager";
import styles from "./Sidebar.module.css";
import ExpressionInput from "../input/ExpressionInput";
import ExpressionInputList from "../input/ExpressionInputList";
import GenerateInProgress from "../../assets/GenerateInProgress";
import { SavingState } from "../../document/UIStateStore";
import SaveInProgress from "../../assets/SaveInProgress";
import {
  TrajectoryNameErrorMessages,
  TrajectoryNameIssue
} from "../../document/path/TrajectoryNameValidation";

type Props = object;

type State = object;

type OptionProps = { uuid: string; selected: boolean };
type OptionState = {
  renaming: boolean;
  renameError: TrajectoryNameIssue | undefined;
  name: string;
  settingsOpen: boolean;
};

class PathSelectorIcon extends Component<
  {
    generating: boolean;
    saveState: SavingState;
    selected: boolean;
    upToDate: boolean;
    onGenerate: () => void;
  },
  object
> {
  render() {
    if (this.props.generating) {
      return (
        <GenerateInProgress
          sx={{
            color: this.props.selected
              ? "var(--select-yellow)"
              : "var(--accent-purple)"
            // marginInline: "2px"
          }}
        ></GenerateInProgress>
      );
    }
    if (this.props.saveState == SavingState.SAVING) {
      return (
        <SaveInProgress
          sx={{
            color: this.props.selected
              ? "var(--select-yellow)"
              : "var(--accent-purple)"
            // marginInline: "2px"
          }}
        ></SaveInProgress>
      );
    }
    if (this.props.saveState == SavingState.ERROR) {
      return (
        <PriorityHigh
          className={styles.SidebarIcon}
          htmlColor={
            this.props.selected
              ? "var(--select-yellow)"
              : "var(--accent-purple)"
          }
        ></PriorityHigh>
      );
    }
    if (this.props.upToDate) {
      return (
        <Route
          className={styles.SidebarIcon}
          htmlColor={
            this.props.selected
              ? "var(--select-yellow)"
              : "var(--accent-purple)"
          }
        />
      );
    }
    return (
      <IconButton
        className={styles.SidebarIcon}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          this.props.onGenerate();
        }}
      >
        <ShapeLine
          className={styles.SidebarIcon}
          htmlColor={
            this.props.selected
              ? "var(--select-yellow)"
              : "var(--accent-purple)"
          }
        ></ShapeLine>
      </IconButton>
    );
  }
}
class PathSelectorOption extends Component<OptionProps, OptionState> {
  state = {
    renaming: false,
    renameError: doc.pathlist.validateName(
      this.getPath().name,
      this.props.uuid
    ),
    name: this.getPath().name,
    settingsOpen: false
  };
  nameInputRef = React.createRef<HTMLInputElement>();
  getSelected() {
    return this.props.selected;
  }
  getPath() {
    return doc.pathlist.paths.get(this.props.uuid)!;
  }
  startRename() {
    this.setState({ renaming: true });
    this.nameInputRef.current!.value = this.getPath().name;
  }
  completeRename() {
    if (
      doc.pathlist.validateName(
        this.nameInputRef.current!.value,
        this.props.uuid
      ) === undefined
    ) {
      const newName = this.nameInputRef.current!.value;
      if (newName !== this.getPath().name) {
        renamePath(this.props.uuid, newName);
      }
      this.setState({
        renaming: false,
        renameError: doc.pathlist.validateName(newName, this.props.uuid),
        name: newName
      });
    } else {
      this.escapeRename();
    }
  }
  escapeRename() {
    this.setState({
      renaming: false,
      renameError: doc.pathlist.validateName(
        this.getPath().name,
        this.props.uuid
      ),
      name: this.getPath().name
    });
  }
  checkName(inputName: string): TrajectoryNameIssue | undefined {
    const error = doc.pathlist.validateName(inputName, this.props.uuid);
    this.setState({ renameError: error, name: inputName });
    return error;
  }
  render() {
    const selected = this.props.selected;
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
        {/* This is a separate component so that the whole PathSelectorOption
            doesn't have to re-render after generation */}
        <PathSelectorIcon
          selected={this.getSelected()}
          saveState={this.getPath().ui.savingState}
          upToDate={this.getPath().ui.upToDate}
          onGenerate={() => doc.generatePath(this.props.uuid)}
          generating={this.getPath().ui.generating}
        ></PathSelectorIcon>
        <Tooltip
          placement="right"
          arrow={true}
          disableInteractive
          title={this.state.renameError?.uiMessage ?? ""}
        >
          <TextField
            className={styles.SidebarLabel}
            variant={"outlined"} //"outlined" : "standard"}
            inputRef={this.nameInputRef}
            error={this.state.renameError !== undefined}
            style={{
              display: "block",
              maxWidth: "100%",
              flexGrow: "1",
              verticalAlign: "middle",
              userSelect: "none"
            }}
            spellCheck={false}
            onChange={() => this.checkName(this.nameInputRef.current!.value)}
            value={this.state.name}
            onKeyDown={(event) => {
              if (event.key == "Enter") {
                this.nameInputRef.current!.blur();
              }
              if (event.key == "Escape") {
                this.escapeRename();
              }
            }}
            inputProps={{
              readOnly: !this.state.renaming,
              style: { userSelect: "none", padding: 0 }
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
              marginLeft: "-4px",
              ".MuiInputBase-root": {
                "&:before": {
                  borderBottom: "2px solid transparent"
                },
                width: "100%",
                height: "1.5em",
                userSelect: "none",
                padding: "4px"
              },
              fieldset: { borderColor: "transparent" }
            }}
          ></TextField>
        </Tooltip>
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
                confirm(`Delete "${this.getPath().name}"?`).then((result) => {
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
            <span style={{ gridColumn: "2 / span 2" }}>
              <ExpressionInputList>
                <ExpressionInput
                  title="dt"
                  enabled={true}
                  number={this.getPath().params.targetDt}
                ></ExpressionInput>
              </ExpressionInputList>
            </span>
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
    const activePath = doc.pathlist.activePathUUID;
    return (
      <div>
        <div className={styles.WaypointList}>
          {Array.from(doc.pathlist.paths.keys()).map((uuid) => (
            <this.Option
              uuid={uuid}
              key={uuid}
              selected={uuid === activePath}
            ></this.Option>
          ))}
        </div>
      </div>
    );
  }
}
export default observer(PathSelector);
