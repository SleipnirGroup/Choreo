import { Tooltip } from "@mui/material";
import { observer } from "mobx-react";
import React, { Component } from "react";
import styles from "./InputList.module.css";

type Props = {
  /** The text to show before the number */
  title: string;
  /** Whether the input should be editable, or else italic and grayed out */
  enabled: boolean;
  /** The value of the input */
  value: boolean;
  setValue: (arg: boolean) => void;
  /** The tooltip for the title */
  titleTooltip?: string;
  inputListCheckbox?: boolean;
};

type State = object;

class Input extends Component<Props, State> {
  inputElemRef: React.RefObject<HTMLInputElement>;
  constructor(props: Props) {
    super(props);
    this.inputElemRef = React.createRef<HTMLInputElement>();
  }

  render() {
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
          type="checkbox"
          className={styles.Checkbox}
          checked={this.props.value}
          disabled={!this.props.enabled}
          // The below is needed to make inputs on CommandDraggables work
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            this.props.setValue(e.currentTarget.checked);
          }}
        ></input>
      </>
    );
  }
}
export default observer(Input);
