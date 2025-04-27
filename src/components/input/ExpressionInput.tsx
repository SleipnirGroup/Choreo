import { Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import { isAlive } from "mobx-state-tree";
import React, { Component } from "react";
import { IExpressionStore, math } from "../../document/ExpressionStore";
import styles from "./InputList.module.css";
import { IReactionDisposer, makeObservable, observable, reaction } from "mobx";

export type ExpressionInputProps = {
  /** The text to show before the number */
  title: string | (() => React.ReactNode);
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
  editedValue: string;
  matchesProp: boolean;
  resetCounter: number;
};
class Input extends Component<ExpressionInputProps, State> {
  inputElemRef: React.RefObject<HTMLInputElement>;
  unsubscriber: IReactionDisposer | undefined;
  number: IExpressionStore;
  constructor(props: ExpressionInputProps) {
    super(props);
    this.number = this.props.number;
    console.log("Creating new input for ", this.number.uuid);
    this.state = {
      matchesProp: true,
      editedValue: this.number.expr.toString(),
      resetCounter: 0 
    };
    this.inputElemRef = React.createRef<HTMLInputElement>();
  }
  // Increment the reset counter state to trigger a re-render that fully recreates the input.
  // This clears the input's own undo history.
  // Should be used when submitting a new value.
  triggerInputRecreate() {
    this.setState({
      resetCounter: this.state.resetCounter + 1
    });
  }

  // Return the string of the expression prop.
  getExprStr(): string {
    return this.number.expr.toString();
  }

  // If the internal state is marked as matching the prop, use the prop's validity
  // Otherwise, validate the internal state.
  getValid(): boolean {
    try {
      if (!this.state.matchesProp) {
        const newNode = this.number.validate(
          math.parse(this.state.editedValue)
        );
        return newNode !== undefined;
      } else {
        return this.number.valid;
      }
    } catch {
      return false;
    }
  }
  // Reset the input to the prop and remove focus if currently focused.
  // This does not re-run onBlur if the input is not already focused.
  revert() {
    this.setState({
      editedValue: this.getExprStr(),
      matchesProp: true
    });
    this.inputElemRef.current?.blur();
  }
  // Update the internal state to a new value.
  update(newVal: string) {
    this.setState({
      editedValue: newVal,
      matchesProp: false
    });
  }
  // Set up a listener for the string of the prop-supplied expression
  // This updates the component internal state, forcing a re-render
  // whenever the string changes externally. If the

  componentDidMount(): void {
    this.unsubscriber = reaction(
      () => this.getExprStr(),
      (_) => this.revert()
    );
  }
  // Immediately before destroying the component, clean up the listener
  componentWillUnmount(): void {
    this.unsubscriber?.();
  }
  render() {
    console.log(this.number.expr.toString(), this.getExprStr())
    if (!isAlive(this.number)) {
      return <></>;
    }
    const showNumberWhenDisabled = this.props.showNumberWhenDisabled ?? true;
    let characters = this.getExprStr().length + 3;
    if (this.props.maxWidthCharacters !== undefined) {
      characters = Math.min(characters, this.props.maxWidthCharacters);
    }
    return (
      <>
        {this.props.title instanceof Function ? (
          this.props.title()
        ) : (
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
              {this.props.title as string}
            </span>
          </Tooltip>
        )}
        <input
          key={this.state.resetCounter}
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
          onBlur={(_e) => {
            const newNode = this.number.validate(
              math.parse(this.state.editedValue)
            );
            if (
              newNode !== undefined &&
              !newNode.equals(this.number.expr)
            ) {
              this.number.set(newNode);
            } else {
              this.revert();
            }
            // Increment the reset counter to trigger a re-creation of the input
            // and clear its internal undo history
            this.triggerInputRecreate();
          }}
          onChange={(e) => {
            this.update(e.target.value);
            e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              this.inputElemRef.current?.blur();
            }
          }}
          value={this.state.editedValue}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        ></input>
      </>
    );
  }


}
const ObservedInput = observer(Input);
// Recreate the input element entirely when the store changes.
function ExpressionInput(props:ExpressionInputProps) {
  return <ObservedInput {...props} key={props.number.uuid}></ObservedInput>;
}
export default ExpressionInput;
