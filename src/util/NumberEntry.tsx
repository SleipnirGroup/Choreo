import { observer } from "mobx-react";
import React, { Component } from "react";
import styles from "./NumberEntry.module.css";

type Props = {
  longestTitle: string;
  title: string;
  suffix: string;
  enabled: boolean;
  number: number;
  setNumber: (arg0: number) => void;
  setEnabled: (arg0: boolean) => void;
  showCheckbox?: boolean;
};

type State = {};
class NumberEntry extends Component<Props, State> {
  numberRef: React.RefObject<HTMLInputElement>;
  constructor(props: Props) {
    super(props);
    this.setEnabled = this.setEnabled.bind(this);
    this.setNumber = this.setNumber.bind(this);
    this.numberRef = React.createRef<HTMLInputElement>();
  }
  setEnabled(event: React.ChangeEvent<HTMLInputElement>) {
    this.props.setEnabled(event.target.checked);
  }
  setNumber(event: React.ChangeEvent<HTMLInputElement>) {
    let value = event.target.value;
    if (value === "+" || value === "-" || value === ".") return;
    let input = Number.parseFloat(value);
    if (!Number.isNaN(input)) {
      this.props.setNumber(input);
    }
  }
  correctNumber() {
    if (this.numberRef.current) {
      // splits the number at the first decimal point, and removes anything beyond 3 digits after the decimal point
      // to change this, modify the el.substring(0, x) x being the desired number of digits after the decimal point
      this.numberRef.current.value = `${this.props.number
        .toString()
        .split(".")
        .map((el, i) => (i !== 0 ? el.substring(0, 3) : el))
        .join(".")}`;
    }
  }
  componentDidMount(): void {
    this.correctNumber();
  }

  render() {
    this.correctNumber();
    return (
      <div
        className={
          styles.Container +
          (this.props.showCheckbox ? "" : ` ${styles.NoCheckbox}`)
        }
      >
        <span
          className={styles.Title}
          style={{ width: `${this.props.longestTitle.length}ch` }}
        >
          {this.props.title}
        </span>
        <input
          ref={this.numberRef}
          type="text"
          className={styles.Number}
          disabled={!this.props.enabled}
          onChange={this.setNumber}
          onBlur={(e) => this.correctNumber()}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        ></input>
        <span className={styles.Suffix}>{this.props.suffix}</span>
        {this.props.showCheckbox && (
          <input
            type="checkbox"
            className={styles.Checkbox}
            checked={this.props.enabled}
            onChange={this.setEnabled}
          ></input>
        )}
      </div>
    );
  }
}
export default observer(NumberEntry);
