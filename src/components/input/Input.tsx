import { Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import React, { Component } from "react";
import styles from "./InputList.module.css";

type Props = {
  /** The text to show before the number */
  title: string;
  /** The text to show before the number */
  suffix: string;
  /** Whether the input should be editable, or else italic and grayed out */
  enabled: boolean;
  checkboxEnabled?: boolean;
  /** The value of the input */
  number: number;
  /** The number of decimal places to show when not editing. */
  roundingPrecision?: number;
  setNumber: (newNumber: number) => void;
  setEnabled: (value: boolean) => void;
  /** Show a checkbox after the suffix that controls the enabled state of the input */
  showCheckbox?: boolean;
  /** Whether or not to show the number when the input is disabled */
  showNumberWhenDisabled?: boolean;
  /** The tooltip for the title */
  titleTooltip?: string;
  /** Maximum width of the number input, in monospace characters */
  maxWidthCharacters?: number;
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
      editedValue: ""
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
      editedValue: this.props.number.toString()
    });
  }

  focusedMode() {
    this.setState({
      focused: true,
      editing: false,
      editedValue: this.props.number.toString()
    });
    this.inputElemRef.current!.value = this.props.number.toString();
    this.inputElemRef.current!.select();
  }

  editingMode() {
    this.setState({
      focused: true,
      editing: true
    });
  }

  getDisplayStr(): string {
    if (this.state.editing) {
      return this.state.editedValue;
    } else {
      if (this.state.focused) {
        return this.props.number.toString();
      } else {
        return this.getRoundedStr();
      }
    }
  }

  getRoundedStr(): string {
    const precision = this.props.roundingPrecision ?? 3;
    return (
      Math.round(this.props.number * 10 ** precision) /
      10 ** precision
    ).toFixed(precision);
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
    const showNumberWhenDisabled = this.props.showNumberWhenDisabled ?? true;
    let characters = this.getRoundedStr().length + 3;
    if (this.props.maxWidthCharacters !== undefined) {
      characters = Math.min(characters, this.props.maxWidthCharacters);
    }
    return (
      <>
        <Tooltip disableInteractive title={this.props.titleTooltip ?? ""}>
          <span
            className={
              styles.Title +
              " " +
              (this.props.enabled ? "" : styles.Disabled) +
              " " +
              (this.props.titleTooltip === undefined ? "" : styles.Tooltip)
            }
          >
            {this.props.title}
          </span>
        </Tooltip>
        <input
          ref={this.inputElemRef}
          type="text"
          className={
            styles.Number +
            (showNumberWhenDisabled ? " " + styles.ShowWhenDisabled : "")
          }
          style={{ minWidth: `${characters}ch` }}
          disabled={!this.props.enabled}
          // The below is needed to make inputs on CommandDraggables work
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => {
            this.focusedMode();
          }}
          onBlur={(e) => {
            const newNumber = parseFloat(this.state.editedValue);
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
              editedValue: e.target.value
            });
            e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              this.inputElemRef.current?.blur();
              // let newNumber = parseFloat(this.state.editedValue);
              // if (!Number.isNaN(newNumber)) {
              //   this.props.setNumber(newNumber);
              // }
              // this.unfocusedMode();
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
            disabled={!(this.props.checkboxEnabled ?? true)}
          ></input>
        ) : (
          <span></span>
        )}
      </>
    );
  }
}
export default observer(Input);
