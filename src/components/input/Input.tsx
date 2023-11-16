import { Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import React, { Component } from "react";
import styles from "./InputList.module.css";

type Props = {
  title: string;
  suffix: string;
  enabled: boolean;
  number: number;
  roundingPrecision?: number;
  setNumber: (newNumber: number) => void;
  setEnabled: (value: boolean) => void;
  showCheckbox?: boolean;
  titleTooltip?: string;
};

type State = {
  focused: boolean;
  editing: boolean;
  editedValue: string;
};

class Input extends Component<Props, State> {
  inputElemRef: React.RefObject<HTMLInputElement>;
  constructor(props: Props) {
    super(props);
    this.state = {
      focused: false,
      editing: false,
      editedValue: "",
    };
    this.inputElemRef = React.createRef<HTMLInputElement>();
  }
  setEnabled = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.props.setEnabled(event.target.checked);
  };

  unfocusedMode() {
    this.setState({
      focused: false,
      editing: false,
    });
  }

  focusedMode() {
    this.setState({
      focused: true,
      editing: false,
    });
    this.inputElemRef.current!.value = this.props.number.toString();
    this.inputElemRef.current!.select();
  }

  editingMode() {
    this.setState({
      focused: true,
      editing: true,
    });
  }

  getDisplayStr(): string {
    if (this.state.editing) {
      return this.state.editedValue;
    } else {
      if (this.state.focused) {
        return this.props.number.toString();
      } else {
        return this.props.number.toPrecision(4);
      }
    }
  }

  componentDidUpdate(
    prevProps: Readonly<Props>,
    prevState: Readonly<State>,
    snapshot?: any
  ): void {
    if (prevProps.number !== this.props.number) {
      // if the value has changed from the outside, make sure it is no longer
      // focused so concise precision is shown.
      this.unfocusedMode();
    }
  }

  render() {
    return (
      <>
        <Tooltip disableInteractive title={this.props.titleTooltip ?? ""}>
          <span
            className={
              styles.Title + " " + (this.props.enabled ? "" : styles.Disabled)
            }
            style={
              (this.props.titleTooltip ?? "") == ""
                ? {}
                : {
                    textDecorationLine: "underline",
                    textDecorationStyle: "dotted",
                    textUnderlineOffset: "2px",
                  }
            }
          >
            {this.props.title}
          </span>
        </Tooltip>
        <input
          ref={this.inputElemRef}
          type="text"
          className={styles.Number}
          disabled={!this.props.enabled}
          onFocus={(e) => {
            this.focusedMode();
          }}
          onBlur={(e) => {
            let newNumber = parseFloat(this.state.editedValue);
            if (!Number.isNaN(newNumber)) {
              this.props.setNumber(newNumber);
            }
            this.unfocusedMode();
          }}
          onChange={(e) => {
            if (!this.state.editing) {
              this.editingMode();
            }
            this.setState({
              editedValue: e.target.value,
            });
            e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              let newNumber = parseFloat(this.state.editedValue);
              if (!Number.isNaN(newNumber)) {
                this.props.setNumber(newNumber);
              }
              this.focusedMode();
            }
          }}
          value={this.getDisplayStr()}
          onMouseDown={(e) => {
            if (!this.state.focused) {
              this.focusedMode();
              e.preventDefault();
            }
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        ></input>
        <span
          className={
            styles.Suffix + " " + (this.props.enabled ? "" : styles.Disabled)
          }
        >
          {this.props.suffix}
        </span>
        {this.props.showCheckbox ? (
          <input
            type="checkbox"
            className={styles.Checkbox}
            checked={this.props.enabled}
            onChange={this.setEnabled}
          ></input>
        ) : (
          <span></span>
        )}
      </>
    );
  }
}
export default observer(Input);
