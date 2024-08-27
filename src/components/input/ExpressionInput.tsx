import { Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import React, { Component } from "react";
import { IExpressionStore, math } from "../../document/ExpressionStore";
import styles from "./InputList.module.css";

type Props = {
  /** The text to show before the number */
  title: string;
  /** Whether the input should be editable, or else italic and grayed out */
  enabled: boolean;
  /** The value of the input */
  number: IExpressionStore;
  /** The number of decimal places to show when not editing. */
  roundingPrecision?: number;
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
      editedValue: this.props.number.expr.toString()
    };
    this.inputElemRef = React.createRef<HTMLInputElement>();
  }

  unfocusedMode() {
    this.setState({
      focused: false,
      editing: false,
      editedValue: this.props.number.expr.toString()
    });
  }

  focusedMode() {
    this.setState({
      focused: true,
      editing: false,
      editedValue: this.props.number.expr.toString()
    });
    this.inputElemRef.current!.value = this.props.number.expr.toString();
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
        return this.props.number.expr.toString();
      } else {
        return this.getRoundedStr();
      }
    }
  }

  getRoundedStr(): string {
    const precision = this.props.roundingPrecision ?? 3;
    return math.format(this.props.number.toDefaultUnit(), {
      precision
    });
  }

  getValid(): boolean {
    try {
      const newNode = this.props.number.validate(
        math.parse(this.state.editedValue)
      );
      return newNode !== undefined;
    } catch {
      return false;
    }
  }
  componentDidUpdate(
    prevProps: Readonly<Props>,
    prevState: Readonly<State>,
    snapshot?: any
  ): void {
    if (!prevProps.number.expr.equals(this.props.number.expr)) {
      // if the value has changed from the outside, make sure it is no longer
      // focused so concise precision is shown.
      this.unfocusedMode();
    }
  }

  render() {
    try {
      //eslint-disable-next-line @typescript-eslint/no-unused-expressions
      this.props.number.expr;
    } catch (e) {
      console.error(e);
      throw e;
    }
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
            (showNumberWhenDisabled ? " " + styles.ShowWhenDisabled : "") +
            (this.getValid() ? " " : " " + styles.Invalid)
          }
          style={{
            minWidth: `${characters}ch`,
            gridColumn: "span 1"
          }}
          disabled={!this.props.enabled}
          // The below is needed to make inputs on CommandDraggables work
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => {
            this.focusedMode();
          }}
          onBlur={(e) => {
            const newNode = this.props.number.validate(
              math.parse(this.state.editedValue)
            );
            if (newNode !== undefined) {
              this.props.number.set(newNode);
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
      </>
    );
  }
}
export default observer(Input);
