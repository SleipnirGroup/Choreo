import React, { Component } from "react";
import { Unit, format, parse, unit, MathNode } from "mathjs";
import * as math from "mathjs";
import { IExpressionStore } from "../../document/ExpressionStore";
import { observer } from "mobx-react";

type Props = {
  expr: IExpressionStore;
};

type State = {
  focused: boolean;
  editing: boolean;
  editedValue: string;
  valid: boolean;
};

class Input2 extends Component<Props, State> {
  inputElemRef: React.RefObject<HTMLInputElement>;
  constructor(props: Props) {
    super(props);
    this.state = {
      focused: false,
      editing: false,
      editedValue: "",
      valid: props.expr.validate(props.expr.expr) !== undefined
    };
    this.inputElemRef = React.createRef<HTMLInputElement>();
  }

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
        return this.props.expr.expr.toString();
      } else {
        return format(this.props.expr.expr.evaluate().to(this.props.expr.defaultUnit), {
          precision: 4,
        });
      }
    }
  }

  componentDidUpdate(): void {
    if (this.state.focused && !this.state.editing) {
      this.inputElemRef.current!.select();
    }
  }
  checkValidity(): void {
    let newNode = this.props.expr.validate(math.parse(this.state.editedValue));
    let valid = newNode!== undefined;
    this.setState({valid});
  }

  render() {
    return (
      <input
        style={{
            border: this.state.valid ? "none": "2px solid red"
        }}
        ref={this.inputElemRef}
        type="text"
        
        onFocus={() => {
          this.focusedMode();
        }}
        onBlur={() => {
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
            this.checkValidity();
            if (e.key == "Enter") {
                this.inputElemRef.current?.blur();
            }
          }
        }
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
    );
  }
}
export default observer(Input2);
