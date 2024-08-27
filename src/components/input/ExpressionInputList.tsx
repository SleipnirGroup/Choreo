import { observer } from "mobx-react";
import React, { Component, PropsWithChildren } from "react";
import styles from "./InputList.module.css";

type Props = {
  rowGap?: number;
  style?: React.CSSProperties;
};

type State = object;

class InputList extends Component<PropsWithChildren<Props>, State> {
  state = {};
  render() {
    const className = styles.InputList + " " + styles.Expression;
    const rowGap = this.props.rowGap ?? 0;
    return (
      <div className={className} style={{ rowGap, ...this.props.style }}>
        {this.props.children}
      </div>
    );
  }
}
export default observer(InputList);
